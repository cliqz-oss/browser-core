import { window, chrome } from './globals';

export class Window {
  constructor(window) {
    this.window = window;
  }
}

export function mapWindows() {
  return [window];
}


export function isTabURL() {
  return false;
}

export function getLang() {
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

export function setInstallDatePref() { }
export function setOurOwnPrefs() { }
export function enableChangeEvents() {}

export function addWindowObserver() {}
export function removeWindowObserver() {}

export function addSessionRestoreObserver() {}
export function removeSessionRestoreObserver() {}

export function addMigrationObserver() {}
export function removeMigrationObserver() {}
export function forEachWindow(cb) {
  mapWindows().forEach(cb);
}
export function mustLoadWindow() {
  return true;
}

export function waitWindowReady(win) {
  return Promise.resolve();
}

export function newTab(url, active = false) {
  return new Promise((resolve) => {
    chrome.tabs.create(
      { url, active },
      (tab) => { resolve(tab.id); },
    );
  });
}


export function closeTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.remove(Number(tabId), resolve);
  });
}


export function updateTab(tabId, url) {
  return new Promise((resolve) => {
    chrome.tabs.update(Number(tabId), { url }, resolve);
  });
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


export function checkIsWindowActive(tabId) {
  if (Number(tabId) < 0) return Promise.resolve(false);

  return new Promise((resolve) => {
    chrome.tabs.get(Number(tabId), () => {
      if (chrome.runtime.lastError) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}


export function getCookies(url) {
  return new Promise((resolve) => {
    chrome.cookies.getAll(
      { url },
      cookies => resolve(cookies.map(c => c.value).join(';'))
    );
  });
}
