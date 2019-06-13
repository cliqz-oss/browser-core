/* global Components, windowTracker, chrome */

import { addStylesheet, removeStylesheet } from '../../../core/helpers/stylesheet';

const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm', {}); // eslint-disable-line no-undef

const FRESHTAB_THEME_PREF = 'extensions.cliqz.freshtab.blueTheme.enabled';
let stylesUrl;

function mapWindows(callback) {
  const enumerator = Services.wm.getEnumerator('navigator:browser');
  const results = [];
  while (enumerator.hasMoreElements()) {
    try {
      const win = enumerator.getNext();
      results.push(callback(win));
    } catch (e) {
      // nothing
    }
  }
  return results;
}

function forEachWindow(callback) {
  mapWindows(callback);
}

function addBlueClass() {
  forEachWindow((window) => {
    const windowNode = window.document.getElementById('main-window');
    windowNode.classList.add('cliqz-blue');
  });
}

function removeBlueClass() {
  forEachWindow((window) => {
    const windowNode = window.document.getElementById('main-window');
    windowNode.classList.remove('cliqz-blue');
  });
}


function onWindowOpened(window) {
  removeStylesheet(window.document, stylesUrl, 'theme-stylesheet');
  addStylesheet(window.document, stylesUrl, 'theme-stylesheet');
  if (Services.prefs.getBoolPref(FRESHTAB_THEME_PREF, true)) {
    addBlueClass();
  }
}

function onWindowClosed(window, url) {
  removeStylesheet(window.document, url, 'theme-stylesheet');
}

export default function initTheme(url) {
  Services.prefs.addObserver(FRESHTAB_THEME_PREF, () => {
    if (Services.prefs.getBoolPref(FRESHTAB_THEME_PREF, false)) {
      addBlueClass();
    } else {
      removeBlueClass();
    }
  });
  stylesUrl = url;
  windowTracker.addOpenListener(onWindowOpened);
  windowTracker.addCloseListener(onWindowClosed);
  for (const window of windowTracker.browserWindows()) {
    onWindowOpened(window);
  }
}
