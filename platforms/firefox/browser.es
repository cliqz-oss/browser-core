import CliqzHumanWeb from 'human-web/human-web';
import utils from 'core/utils';
import events from 'core/events';

const {
  interfaces: Ci,
  utils: Cu,
} = Components;

Cu.import('resource://gre/modules/Services.jsm');

export class Window {
  constructor(window) {
    this.window = window;
  }

  get id() {
    const util = this.window.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindowUtils);
    return util.outerWindowID;
  }
}

export const currentURL = CliqzHumanWeb.currentURL;

export function contextFromEvent() {
  return CliqzHumanWeb.contextFromEvent;
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
  Cu.reportError(e);
}

export function mustLoadWindow(win) {
  return win.location.href === 'chrome://browser/content/browser.xul';
}

export function setInstallDatePref(extensionId) {
  // for legacy users who have not set install date on installation
  try {
    if (!utils.getPref('install_date')) {
      Cu.import('resource://gre/modules/AddonManager.jsm');
      AddonManager.getAddonByID(extensionId, (addon) => {
        const date = Math.floor(addon.installDate.getTime() / 86400000);
        utils.setPref('install_date', date);
      });
    }
  } catch (ex) {
    utils.log(ex.message, 'Extension.jsm: Unable to set install date -> ');
  }
}

export function setOurOwnPrefs() {
  const urlBarPref = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

  if (utils.hasPref('maxRichResultsBackup')) {
    // we reset CLIQZ change to "browser.urlbar.maxRichResults"
    utils.clearPref('maxRichResultsBackup');
    utils.clearPref('browser.urlbar.maxRichResults', '');
  }

  const unifiedComplete = urlBarPref.getPrefType('unifiedcomplete');
  if (unifiedComplete === 128 && urlBarPref.getBoolPref('unifiedcomplete')) {
    utils.setPref('unifiedcomplete', true);
    urlBarPref.setBoolPref('unifiedcomplete', false);
  }
}

/** Reset changed prefs on uninstall */
export function resetOriginalPrefs() {
  const cliqzBackup = utils.getPref('maxRichResultsBackup');
  if (cliqzBackup) {
    utils.log('Loading maxRichResults backup...', 'utils.setOurOwnPrefs');
    utils.setPref('maxRichResults', utils.getPref('maxRichResultsBackup'), 'browser.urlbar.');
    utils.clearPref('maxRichResultsBackup', 0);
  } else {
    utils.log('maxRichResults backup does not exist; doing nothing.', 'utils.setOurOwnPrefs');
  }

  if (utils.getPref('unifiedcomplete', false)) {
    utils.setPref('unifiedcomplete', true, 'browser.urlbar.');
    utils.setPref('unifiedcomplete', false);
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
  return utils.getPref('general.useragent.locale', 'en', '');
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
