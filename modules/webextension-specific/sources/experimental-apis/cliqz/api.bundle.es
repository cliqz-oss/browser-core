/* globals ExtensionAPI */

import changeAddonState from './addon';
import { setSelectedSearchEngine, getSearchEngines } from './search-engines';
import { setTheme, getTheme } from './theme-manager';
import { enableBlueTheme, initTheme } from './browser-theme';
import { openImportDialog, openPageActionPopup, isDefaultBrowser, openBrowserActionPopup } from './browser';
import { setPref, clearPref, prefObserver } from './prefs';
import { createUITourTarget, deleteUITourTarget, hideUITour, showUITour } from './ui-tour';

global.cliqz = class extends ExtensionAPI {
  getAPI(context) {
    return {
      cliqz: {
        createUITourTarget,
        deleteUITourTarget,
        hideUITour,
        showUITour,
        initTheme,
        enableBlueTheme,
        setTheme,
        getTheme,
        setSelectedSearchEngine,
        getSearchEngines,
        changeAddonState,
        openImportDialog,
        openPageActionPopup: openPageActionPopup.bind(null, context.extension.id),
        openBrowserActionPopup,
        isDefaultBrowser,
        setPref,
        clearPref,
        onPrefChange: prefObserver(context),
      }
    };
  }
};
