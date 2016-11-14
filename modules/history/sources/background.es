import background from "core/base/background";
import { utils } from "core/cliqz";
import { queryActiveTabs } from "core/tabs";
import HistoryProvider from "core/history-provider";
import createHistoryDTO from "history/history-dto";
import QueryDatabase from "history/query-database";
import MetaDatabase from "history/meta-database";
import Database from "core/database";

import MixerProxy from "history/mixer-proxy";
import RichHeaderProxy from "history/rich-header-proxy";
/**
* @namespace history
* @class Background
*/
export default background({
  enabled() {
    return true;
  },
  /**
  * @method init
  */
  init() {
    const queryDB = new Database("cliqz-queries"),
          metaDB = new Database("cliqz-metas");

    this.queryDatabase = new QueryDatabase(queryDB);
    this.metaDatabase = new MetaDatabase(metaDB);
    this.mixer = new MixerProxy();
    this.richHeader = new RichHeaderProxy();
  },

  unload() {
  },

  beforeBrowserShutdown() {
  },

  events: {
    /**
    * @event ui:click-on-url
    * @param data
    */
    "ui:click-on-url": function (data) {
      this.actions.recordQuery(data.query, data.url);
    },
    /**
    * @event core:url-meta
    * @param url {string}
    * @param meta
    */
    "core:url-meta": function (url, meta) {
      this.actions.recordMeta(url, meta);
    },
  },

  actions: {
    getHistory({ frameStartsAt, frameEndsAt, limit, domain }) {
      // Allow unlimited queries only for fixed time fames
      if (!(frameStartsAt && frameEndsAt)) {
        limit = limit || 100;
      }

      const limitStatement = limit ? `LIMIT ${limit}` : "";
      const frameStartsAtStatement = frameStartsAt ? `AND last_visit_date >= ${frameStartsAt}` : "";
      const frameEndsAtStatement = frameEndsAt ? `AND last_visit_date < ${frameEndsAt}` : "";
      const domainStatement = domain ? `AND url GLOB '*://${domain}/*'` : "";

      const activeTabs = queryActiveTabs(utils.getWindow());

      const query = `
        SELECT url, title, last_visit_date
        FROM moz_places
        WHERE 1=1
        ${frameStartsAtStatement}
        ${frameEndsAtStatement}
        ${domainStatement}
        ORDER BY last_visit_date DESC
        ${limitStatement}`;

      return HistoryProvider.query(
        query,
        ["url", "last_visit_date", "title"]
      ).then( places => {
        return createHistoryDTO({
          places,
          queryDatabase: this.queryDatabase,
          activeTabs,
          mixer: this.mixer,
          richHeader: this.richHeader,
          metaDatabase: this.metaDatabase,
        });
      });
    },
    /**
     *
     *  {
     *    domain: "cliqz.com", //utils
     *    url: "https://cliqz.com/",
     *    lastVisitedAt: Date.now(), //places
     *    isActive: false, //tabs
     *    isCurrent: false, //tabs
     *    tabIndex: 1, //tabs
     *    meta: {}, //meta
     *    logo: {}, //utils
     *  }
     *
     */
    getQuery(query) {
      const activeTabs = queryActiveTabs(utils.getWindow());

      return  this.queryDatabase.getUrls(query).then( urls => {
        return urls.map(url => {
          const details = utils.getDetailsFromUrl(url),
            domain = details.host,
            logo = utils.getLogoDetails(details),
            meta = this.metaDatabase.getMeta(url),
            activeTab = activeTabs.find( tab => tab.url === url);

          return {
            domain,
            logo,
            meta,
            url,
            isActive: !!activeTab,
            isCurrent: activeTab && activeTab.isCurrent,
            tabIndex: activeTab && activeTab.index
          };
        });
      });
    },

    getQueries() {
      return this.queryDatabase.getQueries();
    },

    openUrl(url) {
      utils.openLink(utils.getWindow(), url);
    },

    selectTabAtIndex(index) {
      utils.getWindow().gBrowser.selectTabAtIndex(index);
    },

    recordQuery(query, url) {
      this.queryDatabase.record(query, url);
    },

    newTab() {
      const window = utils.getWindow();
      const activeTabs = queryActiveTabs(window);
      const freshTab = activeTabs.find( tab => tab.url === "about:cliqz" );

      if ( freshTab ) {
        window.gBrowser.selectTabAtIndex(freshTab.index);
      } else {
        const tab = utils.openLink(window, "about:cliqz", true);
        window.gBrowser.selectedTab = tab;
      }
    },

    recordMeta(url, meta) {
      this.metaDatabase.record(url, meta);
    }

  }
});
