import { window, chrome } from './globals';
import windows from './windows';
import events from '../core/events';

export * from './tabs';
export * from './windows';

// TODO: Refactor
export class Window {
  constructor(win) {
    this.window = win;
  }

  static findByTabId() {

  }

  get id() {
    return this.window.id;
  }
}

let currentWindow = null;
const windowsMap = new Map();

export function mapWindows(fn) {
  return [...windowsMap.values()].map((win) => {
    let ret;
    try {
      ret = fn(win);
    } catch (e) {
      //
    }
    return ret;
  });
}

export function getWindow() {
  return currentWindow;
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

const healthReportPrefObserver = () => events.pub('healthReportChange');

export function enableChangeEvents() {
  if (chrome.cliqz && chrome.cliqz.onPrefChange) {
    chrome.cliqz.onPrefChange.addListener(healthReportPrefObserver, 'datareporting.healthreport.', 'uploadEnabled');
    chrome.cliqz.onPrefChange.addListener(healthReportPrefObserver, 'toolkit.telemetry.', 'enabled');
  }
}

const windowObservers = new WeakMap();

export function addWindowObserver(fn) {
  if (windows === undefined) {
    return;
  }
  const observer = {
    open: win => fn(win, 'opened'),
    focus: windowId => fn({ id: windowId }, 'focused'),
    close: windowId => fn({ id: windowId }, 'closed'),
  };
  windowObservers.set(fn, observer);
  windows.onCreated.addListener(observer.open);
  windows.onFocusChanged.addListener(observer.focus);
  windows.onRemoved.addListener(observer.close);
}

export function removeWindowObserver(fn) {
  if (windows === undefined) {
    return;
  }
  const observer = windowObservers.get(fn);
  windows.onCreated.removeListener(observer.open);
  windows.onFocusChanged.removeListener(observer.focus);
  windows.onRemoved.removeListener(observer.close);
}

export function addSessionRestoreObserver() {}
export function removeSessionRestoreObserver() {}

function windowObserver(win, event) {
  if (event === 'opened') {
    windowsMap.set(win.id, win);
  }
  if (event === 'closed') {
    windowsMap.delete(win.id);
  }
  if (event === 'focused') {
    currentWindow = windowsMap.get(win.id) || currentWindow;
  }
  if (win.focused) {
    currentWindow = win;
  }
}

if (windows !== undefined) {
  addWindowObserver(windowObserver);
  windows.getAll(
    wins => wins.forEach(win => windowObserver(win, 'opened'))
  );
} else {
  currentWindow = window;
  windowsMap.set(undefined, window);
}

export function addMigrationObserver() {}
export function removeMigrationObserver() {}
export function forEachWindow(cb) {
  return mapWindows(cb);
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
    chrome.tabs.query({ active: true, currentWindow: true }, (result) => {
      if (result && result[0]) {
        const tab = result[0];
        resolve({
          id: tab.id,
          url: tab.url,
        });
      } else {
        reject(new Error('Result of query for active tab is undefined'));
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
      if (chrome.runtime.lastError
          && chrome.runtime.lastError.message
          && chrome.runtime.lastError.message.indexOf('firstPartyDomain') > -1) {
        firstPartyIsolationEnabled = !firstPartyIsolationEnabled;
        resolve(getCookies(url));
      } else {
        resolve(cookies.map(c => c.value).join(';'));
      }
    });
  });
}

export function reportError() {}

export function disableChangeEvents() {
  if (chrome.cliqz && chrome.cliqz.onPrefChange) {
    chrome.cliqz.onPrefChange.removeListener(healthReportPrefObserver);
  }
}

export function resetOriginalPrefs() {}

export function isDefaultBrowser() {
  if (chrome.cliqz && chrome.cliqz.isDefaultBrowser) {
    return chrome.cliqz.isDefaultBrowser();
  }

  return Promise.resolve(null);
}

export function isPrivateMode(win) {
  if (!win) {
    throw new Error('isPrivateMode was called without a window object');
  }
  return win.incognito || chrome.extension.inIncognitoContext;
}

export function openLink(win, url, newTab = false, active = true) {
  if (newTab) {
    chrome.tabs.create({ url, active });
  } else {
    chrome.windows.getCurrent({ populate: true }, ({ tabs }) => {
      const activeTab = tabs.find(tab => tab.active);
      chrome.tabs.update(activeTab.id, {
        url
      });
    });
  }
}
