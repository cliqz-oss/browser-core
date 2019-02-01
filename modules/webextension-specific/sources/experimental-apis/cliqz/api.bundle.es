/* globals ExtensionAPI, windowTracker  */

import History, { unifiedSearch, topDomains } from './history';
import changeAddonState from './addon';
import { setSelectedSearchEngine, getSearchEngines } from './search-engines';
import openImportDialog from './browser-control';

global.cliqz = class extends ExtensionAPI {
  getAPI() {
    return {
      cliqz: {
        history: {
          deleteVisit: History.deleteVisit,
          fillFromVisit: History.fillFromVisit,
          showHistoryDeletionPopup: () =>
            History.showHistoryDeletionPopup(windowTracker.getCurrentWindow()),
          markAsHidden: History.markAsHidden,
          cleanupEmptySearches: History.cleanupEmptySearches,
          query: History.query,
        },
        setSelectedSearchEngine,
        getSearchEngines,
        changeAddonState,
        unifiedSearch,
        openImportDialog,
        topDomains
      }
    };
  }
};
