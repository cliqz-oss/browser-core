import History from '../platform/history/history';
import background from '../core/base/background';
import utils from '../core/utils';
import { queryActiveTabs } from '../core/tabs';
import createHistoryDTO from './history-dto';
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
    // const metaDB = new Database('cliqz-metas');
    // this.metaDatabase = new MetaDatabase(metaDB);
    this.history = History;
    this.redirectMap = Object.create(null);
  },

  unload() {
  },

  beforeBrowserShutdown() {
  },

  getSourceUrl(url) {
    const sourceUrl = this.redirectMap[url];
    // delete this.redirectMap[url];

    if (!sourceUrl) {
      return url;
    }

    return this.getSourceUrl(sourceUrl);
  },

  events: {
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
        title: `${query} - CLIQZ Search`,
        visits: [{
          visitDate: Date.now() * 1000,
          transitionType: Components.interfaces.nsINavHistoryService.TRANSITION_TYPED,
        }],
      };

      asyncHistory.updatePlaces(place, {
        handleError: () => {},
        handleResult: () => {},
        handleCompletion: () => {
          utils.setTimeout(() =>
            History.fillFromVisit(url, encodeURI(queryUrl)), 2000);

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
        this.redirectMap[url] = triggeringUrl;

        // clean after some time
        utils.setTimeout(() => {
          delete this.redirectMap[url];
        }, 1000);
      }

      if (originalUrl && triggeringUrl) {
        this.redirectMap[originalUrl] = triggeringUrl;

        // clean after some time
        utils.setTimeout(() => {
          delete this.redirectMap[originalUrl];
        }, 1000);
      }
    },
    'content:location-change': function onLocationChange({ url, triggeringUrl }) {
      const sourceUrl = this.getSourceUrl(triggeringUrl);
      if (url && sourceUrl) {
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
        const activeTabs = queryActiveTabs(utils.getWindow());

        const dto = createHistoryDTO({
          places,
          activeTabs,
        });

        return Object.assign({
          frameStartsAt: from,
          frameEndsAt: to,
        }, dto);
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
      const newTabUrl = utils.CLIQZ_NEW_TAB;
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
    }
  },
});
