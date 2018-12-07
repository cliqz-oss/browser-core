import prefs from '../core/prefs';
import events from '../core/events';
import { removeFile } from '../core/fs';
import { Services, Components } from './globals';

export * from './tabs';
export * from './windows';


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
    // Firefox >= 63
    if (this.window.windowUtils) {
      return this.window.windowUtils.outerWindowID;
    }
    const util = this.window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
      .getInterface(Components.interfaces.nsIDOMWindowUtils);
    return util.outerWindowID;
  }

  static findById(windowId) {
    const windows = mapWindows(w => new Window(w));
    return windows.find(w => w.id === windowId);
  }

  static findByTabId(tabId) {
    const windows = mapWindows(w => new Window(w)).filter(w => w.window.gBrowser);
    return windows.find((w) => {
      const tabs = Array.from(w.window.gBrowser.tabs || []);
      return tabs.find(tab => tab.linkedBrowser && tab.linkedBrowser.outerWindowID === tabId);
    });
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

const OBSOLETE_FILES = [
  // SmartCliqz Cache was removed in X.25.X
  'cliqz/smartcliqz-trigger-urls-cache.json',
  'cliqz/smartcliqz-custom-data-cache.json'
];

const OBSOLETE_PREFS = [
  // browser detection happens every extension start from X.25.X
  'detection',
  // SmartCliqz Cache was removed in X.25.X
  'smart-cliqz-last-clean-ts',
  // startupcache-invalidate was temporary used in 2.24.7 and 1.25.1
  'startupcache-invalidate',
  // removed before X.28.1
  'attrackSourceDomainWhitelist',
  // temporary config
  'config_country_granular',
  // obsolete since X.27.4
  'new_session',
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
  return selectedThemeID === 'firefox-compact-dark@mozilla.org' ? 'dark' : 'default';
}

const branches = new Map();

const observerCliqz = {
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

const observerHealthReport = {
  observe: (subject, topic, data) => {
    if (data === 'uploadEnabled') {
      events.pub('healthReportChange');
    }
  },
};

export function enableChangeEvents() {
  const prefService = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService);

  [
    { prefix: 'extensions.cliqz.', observer: observerCliqz },
    { prefix: 'lightweightThemes.', observer: observerLightweightThemes },
    { prefix: 'datareporting.healthreport.', observer: observerHealthReport },
  ].forEach(({ prefix, observer }) => {
    if (!branches.has(prefix)) {
      const branch = prefService.getBranch(prefix);
      if (!('addObserver' in branch)) {
        branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
      }
      branch.addObserver('', observer, false);

      // Keep track of this branch observer to allow unloading.
      branches.set(prefix, {
        observer,
        branch,
      });
    }
  });
}

export function disableChangeEvents() {
  [...branches.entries()].forEach(([prefix, { observer, branch }]) => {
    branch.removeObserver('', observer);
    branches.delete(prefix);
  });
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
      return Promise.reject(new Error('No open window available'));
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
  return Promise.reject(new Error('Not implemented'));
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


export function getPrincipalForUrl(url) {
  if (url.startsWith('chrome:') || url.startsWith('resource:') || url.startsWith('about:')) {
    // we return system principal only for chrome, resoure and about: pages
    return Services.scriptSecurityManager.getSystemPrincipal();
  }

  // otherwise we simply return a newly created NullPrincipal
  return Services.scriptSecurityManager.createNullPrincipal({});
}


export function loadURIIntoGBrowser(gBrowser, uri) {
  try {
    gBrowser.loadURI(uri);
  } catch (ex) {
    // On Firefox 64 and later, loadURI requires a mandatory
    // `triggeringPrincipal` argument. Unfortunately, specifying this argument
    // in prior versions of Firefox will throw another exception.
    gBrowser.loadURI(uri, { triggeringPrincipal: getPrincipalForUrl(uri) });
  }
}
