import console from '../core/console';
import prefs from '../core/prefs';
import events from '../core/events';
import { Services, Components } from './globals';

export class Window {
  constructor(window) {
    this.window = window;
  }

  get id() {
    const util = this.window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
      .getInterface(Components.interfaces.nsIDOMWindowUtils);
    return util.outerWindowID;
  }
}

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
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator);
  var browserEnumerator = wm.getEnumerator("navigator:browser");
  // ensure an integer as getBrowserForOuterWindowID() is type sensitive
  var int_id = parseInt(windowID);
  if(int_id <= 0) return false;

  while (browserEnumerator.hasMoreElements()) {
    var browserWin = browserEnumerator.getNext();
    var tabbrowser = browserWin.gBrowser;

    // check if tab is open in this window
    // on FF>=39 wm.getOuterWindowWithId() behaves differently to on FF<=38 for closed tabs so we first try
    // gBrowser.getBrowserForOuterWindowID which works on FF>=39, and fall back to wm.getOuterWindowWithId()
    // for older versions.
    try {
      var win = tabbrowser.getBrowserForOuterWindowID(int_id)
      // check for http URI.
      if (win !== undefined) {
        return win.currentURI && (win.currentURI.schemeIs('http') || win.currentURI.schemeIs('https'))
      }
    } catch(e) {
      let tabwindow;
      try {
        tabwindow = wm.getOuterWindowWithId(int_id);
      } catch(e) {
        // if getOuterWindowWithId randomly fails, keep the tab
        return true;
      }
      if(tabwindow == null) {
        return false;
      } else {
        try {
          // check for http URI.
          if (tabwindow.document.documentURI.substring(0, 4) === 'http') {
            let contents = tabwindow.content || tabwindow._content;
            return true;
          } else {
            return false;
          }
        } catch(ee) {
          return false;
        }
      }
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

export function reportError(e) {
  Components.utils.reportError(e);
}

export function mustLoadWindow(win) {
  return win.location.href === 'chrome://browser/content/browser.xul';
}

export function setInstallDatePref(extensionId) {
  // for legacy users who have not set install date on installation
  try {
    if (!prefs.get('install_date')) {
      Components.utils.import('resource://gre/modules/AddonManager.jsm');
      AddonManager.getAddonByID(extensionId, (addon) => {
        const date = Math.floor(addon.installDate.getTime() / 86400000);
        prefs.set('install_date', date);
      });
    }
  } catch (ex) {
    console.log(ex.message, 'Extension.jsm: Unable to set install date -> ');
  }
}

export function setOurOwnPrefs() {
  const urlBarPref = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

  if (prefs.has('maxRichResultsBackup')) {
    // we reset Cliqz change to "browser.urlbar.maxRichResults"
    prefs.clear('maxRichResultsBackup');
    prefs.clear('browser.urlbar.maxRichResults', '');
  }

  const unifiedComplete = urlBarPref.getPrefType('unifiedcomplete');
  if (unifiedComplete === 128 && urlBarPref.getBoolPref('unifiedcomplete')) {
    prefs.set('unifiedcomplete', true);
    urlBarPref.setBoolPref('unifiedcomplete', false);
  }

  // disable FF search hints from FF55 (and maybe above)
  urlBarPref.setBoolPref('suggest.enabled', false);
  urlBarPref.setIntPref('timesBeforeHidingSuggestionsHint', 0);
  urlBarPref.setBoolPref('userMadeSearchSuggestionsChoice', true);
  urlBarPref.setBoolPref('suggest.searches', false);

  // telemetry-categories was removed in version X.18.Y
  if(prefs.has('cat')){
    prefs.clear('cat');
    prefs.clear('catHistoryTime');
  }
}

/** Reset changed prefs on uninstall */
export function resetOriginalPrefs() {
  const cliqzBackup = prefs.get('maxRichResultsBackup');
  if (cliqzBackup) {
    console.log('Loading maxRichResults backup...', 'utils.setOurOwnPrefs');
    prefs.set('maxRichResults', prefs.get('maxRichResultsBackup'), 'browser.urlbar.');
    prefs.clear('maxRichResultsBackup', 0);
  } else {
    console.log('maxRichResults backup does not exist; doing nothing.', 'utils.setOurOwnPrefs');
  }

  if (prefs.get('unifiedcomplete', false)) {
    prefs.set('unifiedcomplete', true, 'browser.urlbar.');
    prefs.set('unifiedcomplete', false);
  }
}

let branch;
const observer = {
  observe: (subject, topic, data) => {
    events.pub('prefchange', data);
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
}

export function disableChangeEvents() {
  if (branch) {
    branch.removeObserver('', observer);
    branch = null;
  }
}

export function getLang() {
  return prefs.get('general.useragent.locale', 'en', '');
}

export function waitWindowReady(win) {
  return new Promise(resolve => {
    if (!win.document || win.document.readyState !== 'complete') {
      win.addEventListener('load', function loader() {
        win.removeEventListener('load', loader, false);
        if (mustLoadWindow(win)) {
          resolve(win);
        }
      }, false);
    } else {
      resolve(win);
    }
  });
}


export function getActiveTab() {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator);
  const window = wm.getMostRecentWindow("navigator:browser");
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
