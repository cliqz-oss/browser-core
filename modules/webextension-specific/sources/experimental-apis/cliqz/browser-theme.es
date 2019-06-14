/* global windowTracker */

import { addStylesheet, removeStylesheet } from '../../../core/helpers/stylesheet';

const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm', {}); // eslint-disable-line no-undef

const FRESHTAB_THEME_PREF = 'extensions.cliqz.freshtab.blueTheme.enabled';

function addBlueClass() {
  for (const window of windowTracker.browserWindows()) {
    const windowNode = window.document.getElementById('main-window');
    windowNode.classList.add('cliqz-blue');
  }
}

function removeBlueClass() {
  for (const window of windowTracker.browserWindows()) {
    const windowNode = window.document.getElementById('main-window');
    windowNode.classList.remove('cliqz-blue');
  }
}

export function enableBlueTheme() {
  Services.prefs.addObserver(FRESHTAB_THEME_PREF, () => {
    if (Services.prefs.getBoolPref(FRESHTAB_THEME_PREF, false)) {
      addBlueClass();
    } else {
      removeBlueClass();
    }
  });
}

function onWindowOpened(window, url, className) {
  removeStylesheet(window.document, url, className);
  addStylesheet(window.document, url, className);
  if (Services.prefs.getBoolPref(FRESHTAB_THEME_PREF, true)) {
    addBlueClass();
  }
}

function onWindowClosed(window, url, className) {
  removeStylesheet(window.document, url, className);
}

export function initTheme(url, className) {
  windowTracker.addOpenListener(window => onWindowOpened(window, url, className));
  windowTracker.addCloseListener(window => onWindowClosed(window, url, className));
  for (const window of windowTracker.browserWindows()) {
    onWindowOpened(window, url, className);
  }
}
