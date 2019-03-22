/* globals ExtensionAPI, windowTracker  */

import History, { unifiedSearch, topDomains, stats } from './history';

global.cliqzHistory = class extends ExtensionAPI {
  getAPI() {
    return {
      cliqzHistory: {
        history: {
          deleteVisit: History.deleteVisit,
          fillFromVisit: History.fillFromVisit,
          showHistoryDeletionPopup: () =>
            History.showHistoryDeletionPopup(windowTracker.getCurrentWindow()),
          markAsHidden: History.markAsHidden,
          cleanupEmptySearches: History.cleanupEmptySearches,
          query: History.query,
          stats,
        },
        unifiedSearch,
        topDomains,
      }
    };
  }
};
