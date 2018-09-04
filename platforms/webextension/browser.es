import { window, chrome } from './globals';

export * from './tabs';
export * from './windows';

export class Window {
  constructor(win) {
    this.window = win;
  }

  static findByTabId() {

  }
}

export function mapWindows(fn) {
  return [window].map((win) => {
    let ret;
    try {
      ret = fn(win);
    } catch (e) {
      //
    }
    return ret;
  });
}


export function isTabURL() {
  return false;
}

export function getLocale() {
  return window.navigator.language || window.navigator.userLanguage;
}

export function getBrowserMajorVersion() {
  let raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  let majorVer = raw ? parseInt(raw[2], 10) : false;
  // Platform `chromium` is used for ghostery build,
  // but it can run in different browsers (chrome, firefox ...)
  if (!majorVer) {
    // try firefox
    raw = navigator.userAgent.match(/Firefox\/([0-9]+)\./);
    majorVer = raw ? parseInt(raw[1], 10) : false;
  }
  return majorVer;
}

export function setOurOwnPrefs() { }
export function enableChangeEvents() {}

export function addWindowObserver() {}
export function removeWindowObserver() {}

export function addSessionRestoreObserver() {}
export function removeSessionRestoreObserver() {}

export function addMigrationObserver() {}
export function removeMigrationObserver() {}
export function forEachWindow(cb) {
  mapWindows(w => w).forEach(cb);
}
export function mustLoadWindow() {
  return true;
}

export function waitWindowReady() {
  return Promise.resolve();
}

export function getUrlForTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(Number(tabId), (result) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(result.url);
      }
    });
  });
}


export function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true }, (result) => {
      const tab = result[0];
      if (tab) {
        resolve({
          id: tab.id,
          url: tab.url,
        });
      } else {
        reject('Result of query for active tab is undefined');
      }
    });
  });
}

let firstPartyIsolationEnabled = false;

export function getCookies(url) {
  return new Promise((resolve) => {
    const query = { url };
    if (firstPartyIsolationEnabled) {
      query.firstPartyDomain = null;
    }
    chrome.cookies.getAll(query, (cookies) => {
      // check for firstPartyDomain error. This indicates that first party isolation is enabled.
      // we need to set a firstPartyDomain option on cookie api calls.
      if (chrome.runtime.lastError &&
          chrome.runtime.lastError.message &&
          chrome.runtime.lastError.message.indexOf('firstPartyDomain') > -1) {
        firstPartyIsolationEnabled = !firstPartyIsolationEnabled;
        resolve(getCookies(url));
      } else {
        resolve(cookies.map(c => c.value).join(';'));
      }
    });
  });
}

export function reportError() {}

export function disableChangeEvents() {}

export function resetOriginalPrefs() {}

export function getThemeStyle() {}
