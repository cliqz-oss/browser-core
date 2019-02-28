/* globals ExtensionAPI, windowTracker */

import History, { unifiedSearch, topDomains, stats } from './history';
import changeAddonState from './addon';
import { setSelectedSearchEngine, getSearchEngines } from './search-engines';

import openImportDialog from './browser-control';
import { setPref, prefObserver } from './prefs';

global.cliqz = class extends ExtensionAPI {
  getAPI(context) {
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
          stats
        },
        setSelectedSearchEngine,
        getSearchEngines,
        changeAddonState,
        unifiedSearch,
        openImportDialog,
        topDomains,
        setPref,
        onPrefChange: prefObserver(context),
      }
    };
  }
};
