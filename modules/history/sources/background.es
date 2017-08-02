import config from '../core/config';
import History from '../platform/history/history';
import background from '../core/base/background';
import utils from '../core/utils';
import { queryActiveTabs } from '../core/tabs';
import createHistoryDTO from './history-dto';
import { equals } from '../core/url';
import MixerProxy from './mixer-proxy';
import RichHeaderProxy from './rich-header-proxy';
import LRU from '../core/LRU';
import migrate from './history-migration';

// import Database from '../core/database';
// import MetaDatabase from './meta-database';

/**
* @namespace history
* @class Background
*/
export default background({
  /**
  * @method init
  */
  init() {
    this.mixer = new MixerProxy();
    this.richHeader = new RichHeaderProxy();
    // const metaDB = new Database('cliqz-metas');
    // this.metaDatabase = new MetaDatabase(metaDB);
    this.history = History;
    this.redirectMap = new LRU(100);
    this.sessionCounts = new Map();

    this.dbMigration = migrate();
  },

  unload() {
    this.dbMigration.dispose();
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

  events: {
    'autocomplete:search': function onSearch(query) {
      /* eslint-disable */
      if (true) {
        return; // TEMP
      }
      /* eslint-enable */
      if (this.sessionCountSubscribtion) {
        this.sessionCountSubscribtion.dispose();
      }

      let sessionCount = this.sessionCounts.get(query);
      if (sessionCount && sessionCount.hasValue) {
        // cache already populated
        return;
      }

      let resolver;
      let rejecter;
      const promise = new Promise((resolve, reject) => {
        resolver = resolve;
        rejecter = reject;
      });

      sessionCount = {
        promise,
      };
      this.sessionCounts.set(query, sessionCount);

      const observable = History.sessionCountObservable(query);
      const subscribtion = observable.subscribe(
        result => resolver(result.count),
        rejecter,
        (success) => {
          // success = 0
          // canceled = 1
          // error = 2
          if (success !== 0) {
            this.sessionCounts.delete(query);
            rejecter();
          } else {
            sessionCount.hasValue = true;
          }
        },
      );

      this.sessionCountSubscribtion = subscribtion;
    },
    /**
    * @event ui:click-on-url
    * @param data
    */
    'ui:click-on-url': function onResult({ query, url }) {
      const asyncHistory = Components.classes['@mozilla.org/browser/history;1']
                         .getService(Components.interfaces.mozIAsyncHistory);
      const queryUrl = `https://cliqz.com/search?q=${query}`;
      const uri = Services.io.newURI(queryUrl, null, null);

      const place = {
        uri,
        title: `${query} - Cliqz Search`,
        visits: [{
          visitDate: Date.now() * 1000,
          transitionType: Components.interfaces.nsINavHistoryService.TRANSITION_TYPED,
        }],
      };

      asyncHistory.updatePlaces(place, {
        handleError: () => {},
        handleResult: () => {},
        handleCompletion: () => {
          utils.setTimeout(() => {
            History.fillFromVisit(url, encodeURI(queryUrl));
          }, 2000);

          History.markAsHidden(queryUrl);
        },
      });
    },
    /**
    * @event core:url-meta
    * @param url {string}
    * @param meta
    */
    'core:url-meta': function onUrlMeta(url, meta) {
      this.actions.recordMeta(url, meta);
    },
    'content:state-change': function onStateChange({ url, originalUrl, triggeringUrl }) {
      if (url && triggeringUrl) {
        this.redirectMap.set(url, triggeringUrl);
      }

      if (originalUrl && triggeringUrl) {
        this.redirectMap.set(originalUrl, triggeringUrl);
      }
    },
    'content:location-change': function onLocationChange({ url, triggeringUrl }) {
      const sourceUrl = this.getSourceUrl(triggeringUrl);
      if (url && sourceUrl && (!equals(url, triggeringUrl))) {
        History.fillFromVisit(url, sourceUrl);
      }
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
        // const activeTabs = queryActiveTabs ? queryActiveTabs(utils.getWindow()) : undefined;
        const dtoP = createHistoryDTO({
          places,
          // mixer: this.mixer,
          // activeTabs,
        });

        return dtoP.then(dto => (
          Object.assign({
            frameStartsAt: from,
            frameEndsAt: to,
          }, dto))
        );
      });
    },

    openUrl(url, newTab = false) {
      utils.openLink(utils.getWindow(), url, newTab);
    },

    selectTabAtIndex(index) {
      utils.getWindow().gBrowser.selectTabAtIndex(index);
    },

    newTab() {
      const window = utils.getWindow();
      const activeTabs = queryActiveTabs(window);
      const newTabUrl = config.settings.NEW_TAB_URL;
      const freshTab = activeTabs.find(tab => tab.url === newTabUrl);

      if (freshTab) {
        window.gBrowser.selectTabAtIndex(freshTab.index);
      } else {
        const tab = utils.openLink(window, newTabUrl, true);
        window.gBrowser.selectedTab = tab;
      }
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
      return this.history.showHistoryDeletionPopup(utils.getWindow());
    },

    sendUserFeedback(data) {
      return utils.sendUserFeedback(data);
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
