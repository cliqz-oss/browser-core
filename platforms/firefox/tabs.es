/* globals PrivateBrowsingUtils */
import { isWindowActive } from './windows';
import { waitFor } from '../core/helpers/wait';
import { Services, Components } from './globals';
import { mapWindows, loadURIIntoGBrowser } from './browser';

try {
  Components.utils.import('resource://gre/modules/PrivateBrowsingUtils.jsm');
} catch (e) {
  console.error(e.message); // eslint-disable-line
}

export function getCurrentgBrowser() {
  return Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator)
    .getMostRecentWindow('navigator:browser')
    .gBrowser;
}

export function newTab(url, { check = true, focus = false } = {}) {
  const gBrowser = getCurrentgBrowser();
  const tab = gBrowser.addTab(url,
    { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });
  let tabId = null;

  if (focus) {
    gBrowser.selectedTab = tab;
  }

  if (!check) {
    tabId = tab.linkedBrowser ? tab.linkedBrowser.outerWindowID : null;
    return Promise.resolve(tabId);
  }

  return waitFor(() => {
    // This might be caused by a blocked main document request
    if (tab.linkedBrowser === null) {
      return false;
    }

    tabId = tab.linkedBrowser.outerWindowID;

    if (tabId === null) {
      return false;
    }

    return isWindowActive(tabId);
  }).then(() => tabId);
}

export function closeTab(tabId) {
  const numTabId = Number(tabId);
  const gBrowser = getCurrentgBrowser();
  const tabToRemove = [...gBrowser.tabs].find(tab =>
    numTabId === tab.linkedBrowser.outerWindowID);

  if (tabToRemove === undefined) {
    return Promise.reject(new Error(`Could not find tab ${tabId}`));
  }

  // Remove tab
  gBrowser.removeTab(tabToRemove);

  return waitFor(() => !isWindowActive(numTabId));
}

export function getCurrentTab() {
  const gBrowser = getCurrentgBrowser();
  return [...gBrowser.tabs].find(tab => gBrowser.selectedBrowser === tab.linkedBrowser);
}

export function updateTab(tabId, { url }) {
  const numTabId = Number(tabId);
  const gBrowser = getCurrentgBrowser();
  const tabToUpdate = [...gBrowser.tabs].find(tab =>
    numTabId === tab.linkedBrowser.outerWindowID);

  if (tabToUpdate === undefined) {
    return Promise.reject(new Error(`Could not find tab ${tabId}`));
  }

  loadURIIntoGBrowser(gBrowser.getBrowserForTab(tabToUpdate), url);

  return waitFor(() => Promise.resolve(
    gBrowser.getBrowserForTab(tabToUpdate).currentURI.spec === url
  ));
}

export function updateCurrentTab(url) {
  const tab = getCurrentTab();
  return updateTab(tab.outerWindowID, { url });
}

export function getTab(tabId) {
  const numTabId = Number(tabId);
  const gBrowser = getCurrentgBrowser();
  const tabToUpdate = [...gBrowser.tabs].find(tab =>
    numTabId === tab.linkedBrowser.outerWindowID);
  const tab = gBrowser.getBrowserForTab(tabToUpdate);
  return {
    url: tab.currentURI.spec,
    id: tab.linkedBrowser.outerWindowID,
    incognito: PrivateBrowsingUtils.isWindowPrivate(gBrowser.ownerGlobal),
    active: tab.linkedBrowser === gBrowser.selectedBrowser,
  };
}


export function query(queryInfo) {
  if (Object.keys(queryInfo).length !== 0) {
    throw new Error('query currently only support getting all tabs');
  }

  const gBrowser = getCurrentgBrowser();
  return Array.prototype.map.call(gBrowser.tabs,
    (tab) => {
      const currentBrowser = gBrowser.getBrowserForTab(tab);
      let url;
      if (currentBrowser && currentBrowser.currentURI) {
        url = currentBrowser.currentURI.spec;
      }

      return {
        id: tab.linkedBrowser.outerWindowID,
        url,
      };
    });
}

export default {
  onCreated: {
    addListener() {},
    removeListener() {},
  },
  onUpdated: {
    addListener() {},
    removeListener() {},
  },
  onRemoved: {
    addListener() {},
    removeListener() {},
  },
};

export function pinTab(window, tab) {
  let t;
  if (typeof tab.index === 'number') {
    t = window.gBrowser.tabs[tab.index];
  } else {
    t = tab;
  }
  if (!t.pinned) {
    window.gBrowser.pinTab(t);
  }
}

export function queryActiveTabs(window) {
  if (!window.gBrowser) {
    return [];
  }

  const selectedBrowser = window.gBrowser.selectedBrowser;
  return Array.prototype.map.call(window.gBrowser.tabs, (tab, index) => ({
    index,
    url: tab.linkedBrowser.currentURI.spec,
    isCurrent: selectedBrowser === tab.linkedBrowser,
    isPinned: tab.pinned,
  }));
}

export function getTabsWithUrl(window, url) {
  return Array.prototype.filter.call(window.gBrowser.tabs,
    (tab => tab.linkedBrowser.currentURI.spec === url && tab));
}

function getTabById(window, tabId) {
  const tab = [...window.gBrowser.tabs].find(t => t.linkedBrowser.outerWindowID === tabId);
  if (!tab) {
    return null;
  }
  return tab.linkedBrowser;
}

export function closeTabsWithUrl(url) {
  mapWindows((window) => {
    getTabsWithUrl(window, url).forEach(tab =>
      tab.ownerGlobal.gBrowser.removeTab(tab));
  });
  return Promise.resolve();
}

export function getWindowByTabId(tabId) {
  let win = null;
  mapWindows(w => w).some((window) => {
    const tab = getTabById(window, tabId);
    if (!tab) {
      return false;
    }
    win = window;
    return true;
  });
  return win;
}

export function getCurrentTabId(window) {
  return window.gBrowser.selectedBrowser && window.gBrowser.selectedBrowser.outerWindowID;
}

export function queryTabs() {
  const windows = mapWindows(w => w);
  const tabs = windows.map(window =>
    ([...window.gBrowser.tabs].map((tab) => {
      const browser = tab.linkedBrowser;
      return {
        id: browser.outerWindowID,
        url: browser.currentURI.spec,
      };
    })));

  return Promise.resolve(
    [].concat(...tabs)
  );
}

export function reloadTab(tabId) {
  mapWindows((w) => {
    const tab = getTabById(w, tabId);
    if (tab) {
      tab.reload();
    }
  });
  return Promise.resolve();
}
