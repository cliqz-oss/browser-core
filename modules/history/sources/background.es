import inject from '../core/kord/inject';
import config from '../core/config';
import pacemaker from '../core/services/pacemaker';
import History from '../platform/history/history';
import { getActiveTab, openLink, getWindow } from '../core/browser';
import HistoryService from '../core/history-service';
import background from '../core/base/background';
import createHistoryDTO from './history-dto';
import { equals, getDetailsFromUrl } from '../core/url';
import RichHeaderProxy from './rich-header-proxy';
import LRU from '../core/LRU';
import migrate from './history-migration';
import { isCliqzBrowser, getResourceUrl } from '../core/platform';
import prefs from '../core/prefs';

// import Database from '../core/database';
// import MetaDatabase from './meta-database';
const NEW_TAB_URL = getResourceUrl(config.settings.NEW_TAB_URL);
const HISTORY_URL = getResourceUrl(config.settings.HISTORY_URL);

const CLIQZ_INTERFACE_PAGES = [
  NEW_TAB_URL,
  HISTORY_URL,
  getResourceUrl(config.settings.ONBOARDING_URL),
];

/**
* @namespace history
* @class Background
*/
export default background({
  requiresServices: ['logos', 'pacemaker'],
  core: inject.module('core'),
  /**
  * @method init
  */
  init(settings) {
    this.richHeader = new RichHeaderProxy(settings);
    // const metaDB = new Database('cliqz-metas');
    // this.metaDatabase = new MetaDatabase(metaDB);
    this.history = History;
    this.redirectMap = new LRU(100);
    this.sessionCounts = new Map();

    if (HistoryService && HistoryService.onVisitRemoved) {
      this.onVisitRemovedListener = this._onVisitRemovedListener.bind(this);
      this.onVisitedListener = this._onVisitedListener.bind(this);
      this.onRedirectListener = this._onRedirectListener.bind(this);

      HistoryService.onVisitRemoved.addListener(this.onVisitRemovedListener);
      HistoryService.onVisited.addListener(this.onVisitedListener);
      chrome.webRequest.onBeforeRedirect.addListener(this.onRedirectListener, {
        urls: ['*://*/*'],
        types: ['main_frame'],
      });
      chrome.webRequest.onCompleted.addListener(this.onRedirectListener, {
        urls: ['*://*/*'],
        types: ['main_frame'],
      });
    }

    if (isCliqzBrowser && !prefs.get('modules.history.cleanupComplete', false)) {
      // Clean empty search sessions from history in order to get rid of the potentialy
      // unsafe searches. We perform this operation once as it can be very expensive for
      // profiles with a large history.
      prefs.set('modules.history.cleanupComplete', true);
      this.history.cleanupEmptySearches();
    }
    this.dbMigration = migrate();
  },

  unload() {
    if (this.sessionCountSubscribtion) {
      this.sessionCountSubscribtion.dispose();
    }

    if (this.onVisitRemovedListener) {
      HistoryService.onVisitRemoved.removeListener(this.onVisitRemovedListener);
      HistoryService.onVisited.removeListener(this.onVisitedListener);
      this.onVisitRemovedListener = null;
      this.onVisitedListener = null;
    }

    this.dbMigration.dispose();
  },

  _onRedirectListener({ url, originUrl, redirectUrl }) {
    if (redirectUrl) {
      this.redirectMap.set(redirectUrl, url);
    }

    if (originUrl) {
      this.redirectMap.set(url, originUrl);
    }
  },

  _onVisitRemovedListener(...args) {
    getActiveTab().then(({ id, url }) => {
      if (url.indexOf(HISTORY_URL) !== 0) {
        return;
      }

      this.core.action(
        'broadcastActionToWindow', id, 'history', 'updateHistoryUrls', args
      );
    });
  },

  _onVisitedListener({ url }) {
    const isCliqzInterfacePage = CLIQZ_INTERFACE_PAGES.find(page => url.startsWith(page));
    if (isCliqzInterfacePage) {
      HistoryService.deleteUrl({ url });
      return;
    }
    const sourceUrl = this.getSourceUrl(url);
    if (url && sourceUrl && (!equals(url, sourceUrl))) {
      this.fillFromVisit(url, sourceUrl);
    }
  },

  beforeBrowserShutdown() {
  },

  getSourceUrl(url, path = []) {
    const sourceUrl = this.redirectMap.get(url);

    if (!sourceUrl) {
      return url;
    }

    // Avoid loops, it is not perfect but must do for now
    if (path.indexOf(sourceUrl) >= 0) {
      return sourceUrl;
    }

    return this.getSourceUrl(sourceUrl, [
      ...path,
      sourceUrl,
    ]);
  },

  fillFromVisit(url, triggeringUrl) {
    const { action, scheme, path, originalUrl } = getDetailsFromUrl(url);
    let cleanUrl = originalUrl;
    if (action && action !== 'visiturl') {
      return Promise.resolve();
    }

    // normalize url
    if (!scheme) {
      cleanUrl = `http://${originalUrl}`;
    }
    if (!path) {
      cleanUrl += '/';
    }
    return this.history.fillFromVisit(cleanUrl, triggeringUrl);
  },

  onResult({ query, url, isPrivateMode, isFromAutocompletedURL }) {
    if (isPrivateMode || !url || isFromAutocompletedURL || !query) {
      return;
    }

    const queryUrl = `https://cliqz.com/search?q=${encodeURIComponent(query)}`;
    const visitTime = Date.now();

    this.history.addVisit({
      url: queryUrl,
      title: `${query} - Cliqz Search`,
      visitTime
    }).then(() => {
      // TODO don't
      pacemaker.setTimeout(() => {
        this.fillFromVisit(url, queryUrl).catch(({ visitId }) => {
          if (!visitId) {
            // If there is no visitId, it may be Automatic Forget Tab
            // taking over this url load, in such case we remove 'Cliqz Search'
            // visit from history
            const triggeringVisitTimestamp = visitTime * 1000;
            this.history.deleteVisit(triggeringVisitTimestamp);
          }
        });
      }, 2000);
      History.markAsHidden(queryUrl);
    });
  },

  events: {
    /**
    * @event ui:click-on-url
    * @param data
    */
    'ui:click-on-url': function onUIClick({ query, url, isPrivateMode, isFromAutocompletedURL }) {
      this.onResult({ query, url, isPrivateMode, isFromAutocompletedURL });
    },

    /**
    * @event core:url-meta
    * @param url {string}
    * @param meta
    */
    'core:url-meta': function onUrlMeta(url, meta) {
      this.actions.recordMeta(url, meta);
    },
  },

  actions: {
    getHistory({ frameStartsAt, frameEndsAt, limit, domain, query }) {
      let sessionLimit = limit;
      // Allow unlimited queries only for fixed time fames
      if (!(frameStartsAt && frameEndsAt)) {
        sessionLimit = sessionLimit || 100;
      }

      return this.history.query({
        limit: sessionLimit,
        frameStartsAt,
        frameEndsAt,
        domain,
        query,
      }).then(({ places, from, to }) => {
        // const activeTabs = queryActiveTabs ? queryActiveTabs(getWindow()) : undefined;
        const dtoP = createHistoryDTO({
          places,
          // activeTabs,
        });

        return dtoP.then(dto => (
          Object.assign({
            frameStartsAt: from,
            frameEndsAt: to,
          }, dto)));
      });
    },

    openUrl(url, newTab = false) {
      openLink(getWindow(), url, newTab);
    },

    newTab() {
      openLink(null, NEW_TAB_URL);
    },

    recordMeta(/* url, meta */) {
      // turn off for now
      // this.metaDatabase.record(url, meta);
    },

    deleteVisit(visitId) {
      return this.history.deleteVisit(visitId);
    },

    deleteVisits(visitIds) {
      return this.history.deleteVisits(visitIds);
    },

    showHistoryDeletionPopup() {
      return this.history.showHistoryDeletionPopup(getWindow());
    },

    sendUserFeedback(data) {
      this.core.action('sendUserFeedback', data);
    },
    /*
     * returns undefined if value not is cache
     */
    getSessionCount(query) {
      const sessionCount = this.sessionCounts.get(query);
      if (sessionCount) {
        return sessionCount.promise;
      }
      return Promise.resolve();
    },

    getNews(domain) {
      return this.richHeader.getNews(domain);
    },
  },
});
