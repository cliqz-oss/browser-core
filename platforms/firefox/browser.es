import prefs from '../core/prefs';
import events from '../core/events';
import { removeFile } from '../core/fs';
import { Services, Components } from './globals';


export function mapWindows(callback) {
  const enumerator = Services.wm.getEnumerator('navigator:browser');
  const results = [];
  while (enumerator.hasMoreElements()) {
    try {
      const win = enumerator.getNext();
      results.push(callback(win));
    } catch (e) {
      // Nothing
    }
  }
  return results;
}

export class Window {
  constructor(window) {
    this.window = window;
  }


  get zoomLevel() {
    const nav = this.window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
      .getInterface(Components.interfaces.nsIWebNavigation);
    const docShell = nav.QueryInterface(Components.interfaces.nsIDocShell);
    const docViewer = docShell.contentViewer;
    return docViewer.fullZoom;
  }

  get id() {
    const util = this.window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
      .getInterface(Components.interfaces.nsIDOMWindowUtils);
    return util.outerWindowID;
  }

  static findById(windowId) {
    const windows = mapWindows(w => new Window(w));
    return windows.find(w => w.id === windowId);
  }

  static findByTabId(tabId) {
    const windows = mapWindows(w => new Window(w));
    return windows.find(w =>
      // In some cases `w.window.gBrowser.selectedBrowser` is undefined.
      w.window.gBrowser.selectedBrowser !== undefined &&
      w.window.gBrowser.selectedBrowser.outerWindowID === tabId
    );
  }
}

export function forEachWindow(callback) {
  mapWindows(callback);
}


export function isTabURL(url) {
  const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator);
  const browserEnumerator = wm.getEnumerator('navigator:browser');

  while (browserEnumerator.hasMoreElements()) {
    const browserWin = browserEnumerator.getNext();
    const tabbrowser = browserWin.gBrowser;

    const numTabs = tabbrowser.browsers.length;
    for (let index = 0; index < numTabs; index += 1) {
      const currentBrowser = tabbrowser.getBrowserAtIndex(index);
      if (currentBrowser) {
        const tabURL = currentBrowser.currentURI.spec;
        if (url === tabURL || url === tabURL.split('#')[0]) {
          return true;
        }
      }
    }
  }
  return false;
}


export function getBrowserMajorVersion() {
  const appInfo = Components.classes['@mozilla.org/xre/app-info;1']
    .getService(Components.interfaces.nsIXULAppInfo);
  return parseInt(appInfo.version.split('.')[0], 10);
}


/** Returns true if the give windowID represents an open browser tab's windowID.
 */
export function isWindowActive(windowID) {
  const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator);
  const browserEnumerator = wm.getEnumerator('navigator:browser');

  // the windowID should be an integer
  const numId = Number(windowID);
  if (numId <= 0) {
    return false;
  }

  while (browserEnumerator.hasMoreElements()) {
    const browserWin = browserEnumerator.getNext();
    const tabbrowser = browserWin.gBrowser;

    // check if tab is open in this window
    const win = tabbrowser.getBrowserForOuterWindowID(numId);

    // check for http URI.
    if (win !== undefined) {
      return win.currentURI && (win.currentURI.schemeIs('http') || win.currentURI.schemeIs('https'));
    }
  }

  return false;
}

export function checkIsWindowActive(windowID) {
  return Promise.resolve(isWindowActive(windowID));
}

const windowObservers = new Map();
export function addWindowObserver(callback) {
  const cb = (win, topic) => {
    callback(win, topic === 'domwindowopened' ? 'opened' : 'closed');
  };
  windowObservers.set(callback, cb);
  Services.ww.registerNotification(cb);
}

export function removeWindowObserver(callback) {
  const cb = windowObservers.get(callback);
  if (cb) {
    Services.ww.unregisterNotification(cb);
  }
}

const sessionRestoreObservers = new Set();
export function addSessionRestoreObserver(callback) {
  sessionRestoreObservers.add(callback);
  Services.obs.addObserver(callback, 'sessionstore-windows-restored', false);
}

export function removeSessionRestoreObserver(callback) {
  if (sessionRestoreObservers.has(callback)) {
    sessionRestoreObservers.delete(callback);
    Services.obs.removeObserver(callback, 'sessionstore-windows-restored', false);
  }
}

export function reportError(e) {
  Components.utils.reportError(e);
}

export function mustLoadWindow(win) {
  return win.location.href === 'chrome://browser/content/browser.xul';
}

export function setInstallDatePref(date) {
  // for legacy users who have not set install date on installation
  if (!prefs.get('install_date')) {
    prefs.set('install_date', date);
  }
}

const OBSOLETE_FILES = [
  // SmartCliqz Cache was removed in X.25.X
  'cliqz/smartcliqz-trigger-urls-cache.json',
  'cliqz/smartcliqz-custom-data-cache.json'
];

const OBSOLETE_PREFS = [
  // browser detection happens every extension start from X.25.X
  'detection',
  // SmartCliqz Cache was removed in X.25.X
  'smart-cliqz-last-clean-ts'
];

// do various cleanups from retired features or modules
function cleanup() {
  OBSOLETE_FILES.forEach(fn => removeFile(fn));
  OBSOLETE_PREFS.forEach(pref => prefs.clear(pref));
}

export function setOurOwnPrefs() {
  if (prefs.has('unifiedcomplete', 'browser.urlbar.') && prefs.get('unifiedcomplete', false)) {
    prefs.set('unifiedcomplete', true); // backup
    prefs.set('unifiedcomplete', false, 'browser.urlbar.');
  }

  // disable FF search hints from FF55 (and maybe above)
  prefs.set('timesBeforeHidingSuggestionsHint', 0, 'browser.urlbar.');
  prefs.set('userMadeSearchSuggestionsChoice', true, 'browser.urlbar.');

  if (prefs.get('suggest.searches', false, 'browser.urlbar.')) {
    prefs.set('backup.browser.urlbar.suggest.searches', true);
    prefs.set('suggest.searches', false, 'browser.urlbar.');
  }

  // freshtab is optOut since 2.20.3 for new users
  // we migrate the old ones
  if (prefs.has('freshTabState')) {
    prefs.set('freshtab.state', prefs.get('freshTabState'));
    prefs.clear('freshTabState');
  }

  // use a more suggestive name for human web opt out
  if (prefs.has('dnt')) {
    prefs.set('humanWebOptOut', prefs.get('dnt'));
    prefs.clear('dnt');
  }

  // Firefox merges search resuls with results from previous search by default
  // (INSERTMETHOD.MERGE_RELATED at UnifiedComplete.js).
  // It break Cliq's search in different ways, so we change it to INSERTMETHOD.APPEND
  const insertMethod = prefs.get('insertMethod', -1, 'browser.urlbar.');
  if (insertMethod === -1 || insertMethod > 0) {
    // change it to INSERTMETHOD.APPEND
    prefs.set('insertMethod', 0, 'browser.urlbar.');
    prefs.set('backup.browser.urlbar.insertMethod', insertMethod);
  }

  // schedule a cleanup 1 minute after the browser start
  setTimeout(cleanup, 60000);
}

/** Reset changed prefs on uninstall */
export function resetOriginalPrefs() {
  if (prefs.get('unifiedcomplete', false)) {
    prefs.set('unifiedcomplete', true, 'browser.urlbar.');
    prefs.set('unifiedcomplete', false);
  }

  if (prefs.has('backup.browser.urlbar.suggest.searches')) {
    prefs.clear('backup.browser.urlbar.suggest.searches');
    prefs.clear('suggest.searches', 'browser.urlbar.');
  }

  if (prefs.has('backup.browser.urlbar.insertMethod')) {
    const insertMethod = prefs.get('backup.browser.urlbar.insertMethod', -1);
    if (insertMethod === -1) {
      prefs.clear('insertMethod', 'browser.urlbar.');
    } else {
      prefs.set('insertMethod', insertMethod, 'browser.urlbar.');
    }
    prefs.clear('backup.browser.urlbar.insertMethod');
  }
}

export function getThemeStyle() {
  const selectedThemeID = prefs.get('lightweightThemes.selectedThemeID', '', '');
  return selectedThemeID === 'firefox-compact-dark@mozilla.org' ? 'dark' : 'light';
}

let branch; // cliqz specific prefs
let branchLightweightThemes; // theme specific prefs

const observer = {
  observe: (subject, topic, data) => {
    events.pub('prefchange', data);
  },
};

const observerLightweightThemes = {
  observe: (subject, topic, data) => {
    if (data === 'selectedThemeID') {
      events.pub('hostthemechange', getThemeStyle());
    }
  },
};

export function enableChangeEvents() {
  if (!branch) {
    const prefService = Components.classes['@mozilla.org/preferences-service;1']
      .getService(Components.interfaces.nsIPrefService);
    branch = prefService.getBranch('extensions.cliqz.');
    if (!('addObserver' in branch)) {
      branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    }
    branch.addObserver('', observer, false);
  }

  if (!branchLightweightThemes) {
    const prefService = Components.classes['@mozilla.org/preferences-service;1']
      .getService(Components.interfaces.nsIPrefService);
    branchLightweightThemes = prefService.getBranch('lightweightThemes.');
    if (!('addObserver' in branchLightweightThemes)) {
      branchLightweightThemes.QueryInterface(Components.interfaces.nsIPrefBranch2);
    }
    // using a very specific observer for performance reasons
    branchLightweightThemes.addObserver('', observerLightweightThemes, false);
  }
}

export function disableChangeEvents() {
  if (branch) {
    branch.removeObserver('', observer);
    branch = null;
  }

  if (branchLightweightThemes) {
    branchLightweightThemes.removeObserver('', observerLightweightThemes);
    branchLightweightThemes = null;
  }
}

export function getLocale() {
  try {
    // we need to use Services.locale.defaultLocale starting with
    // Firefox 59 as the other pref was removed
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1414390
    return prefs.get('general.useragent.locale', Services.locale.defaultLocale, '');
  } catch (e) {
    return 'en-US';
  }
}

// resolve only on Idle Callback if available
function resolveOnIdleCallback(win, resolve, to) {
  if (win.requestIdleCallback) {
    win.requestIdleCallback(() => {
      resolve(win);
    }, { timeout: to });
  } else {
    resolve(win);
  }
}

export function waitWindowReady(win) {
  return new Promise((resolve) => {
    if (!win.document || win.document.readyState !== 'complete') {
      win.addEventListener('load', function loader() {
        win.removeEventListener('load', loader, false);
        resolveOnIdleCallback(win, resolve, 1000);
      }, false);
    } else {
      resolveOnIdleCallback(win, resolve, 1000);
    }
  });
}


export function getActiveTab(w) {
  let window = w;
  if (!w) {
    const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
      .getService(Components.interfaces.nsIWindowMediator);
    window = wm.getMostRecentWindow('navigator:browser');
    if (!window) {
      return Promise.reject('No open window available');
    }
  }
  return new Promise((resolve, reject) => {
    // Extract id of the current tab
    let tabId;
    let url;
    try {
      const gBrowser = window.gBrowser;
      const selectedBrowser = gBrowser.selectedBrowser;
      tabId = selectedBrowser.outerWindowID;
      url = selectedBrowser.currentURI.spec;
    } catch (e) { reject(e); }

    resolve({
      id: tabId,
      url,
    });
  });
}


export function getCookies() {
  return Promise.reject('Not implemented');
}


function waitForAsync(fn, depth = 200) {
  if (depth <= 0) {
    return Promise.resolve('waitForAsync max depth');
  }

  return fn()
    .then((value) => {
      if (value) {
        return Promise.resolve();
      }
      return Promise.reject();
    })
    .catch(() => new Promise((resolve) => {
      setTimeout(
        () => {
          resolve(waitForAsync(fn, depth - 1));
        },
        100
      );
    }));
}


function getCurrentgBrowser() {
  return Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator)
    .getMostRecentWindow('navigator:browser')
    .gBrowser;
}


export function newTab(url, check = true) {
  const gBrowser = getCurrentgBrowser();
  const tab = gBrowser.addTab(url);
  let tabId = null;

  if (!check) {
    tabId = tab.linkedBrowser ? tab.linkedBrowser.outerWindowID : null;
    return Promise.resolve(tabId);
  }

  return waitForAsync(() => {
    // This might be caused by a blocked main document request
    if (tab.linkedBrowser === null) {
      return Promise.resolve(false);
    }

    tabId = tab.linkedBrowser.outerWindowID;

    if (tabId === null) {
      return Promise.resolve(false);
    }

    return checkIsWindowActive(tabId);
  }).then(() => tabId);
}


export function closeTab(tabId) {
  const numTabId = Number(tabId);
  const gBrowser = getCurrentgBrowser();
  const tabToRemove = [...gBrowser.tabs].find(tab =>
    numTabId === tab.linkedBrowser.outerWindowID
  );

  if (tabToRemove === undefined) {
    return Promise.reject(`Could not find tab ${tabId}`);
  }

  // Remove tab
  gBrowser.removeTab(tabToRemove);

  return waitForAsync(() => Promise.resolve(!isWindowActive(numTabId)));
}


export function updateTab(tabId, url) {
  const numTabId = Number(tabId);
  const gBrowser = getCurrentgBrowser();
  const tabToUpdate = [...gBrowser.tabs].find(tab =>
    numTabId === tab.linkedBrowser.outerWindowID
  );

  if (tabToUpdate === undefined) {
    return Promise.reject(`Could not find tab ${tabId}`);
  }

  gBrowser.getBrowserForTab(tabToUpdate).loadURI(url);

  return waitForAsync(() => Promise.resolve(
    gBrowser.getBrowserForTab(tabToUpdate).currentURI.spec === url
  ));
}

export function getStartupInfo() {
  return Services.startup.getStartupInfo();
}

const migrationObservers = new Map();
export function addMigrationObserver(callback) {
  const obs = {
    init() {
      Services.obs.addObserver(this, 'Migration:Ended', false);
      migrationObservers.set(callback, this);
    },

    uninit() {
      Services.obs.removeObserver(this, 'Migration:Ended');
      migrationObservers.delete(callback);
    },

    observe(subject, topic, data) {
      callback(subject, topic, data);
    }
  };
  obs.init();
}

export function removeMigrationObserver(callback) {
  const obs = migrationObservers.get(callback);
  if (obs) {
    obs.uninit();
  }
}
