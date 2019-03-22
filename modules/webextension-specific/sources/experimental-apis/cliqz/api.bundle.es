/* globals ExtensionAPI */

import changeAddonState from './addon';
import { setSelectedSearchEngine, getSearchEngines } from './search-engines';
import { openImportDialog, isDefaultBrowser } from './browser';
import { setPref, prefObserver } from './prefs';

global.cliqz = class extends ExtensionAPI {
  getAPI(context) {
    return {
      cliqz: {
        setSelectedSearchEngine,
        getSearchEngines,
        changeAddonState,
        openImportDialog,
        isDefaultBrowser,
        setPref,
        onPrefChange: prefObserver(context),
      }
    };
  }
};
