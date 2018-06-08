import { mapWindows } from './browser';

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
  if (window.gBrowser === null) {
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

export function closeTab(window, tab) {
  window.gBrowser.removeTab(tab);
}

export function getCurrentTabId(window) {
  return window.gBrowser.selectedBrowser && window.gBrowser.selectedBrowser.outerWindowID;
}

export function updateTabById(tabId, { url }) {
  mapWindows(w => w).some((window) => {
    const tab = getTabById(window, tabId);
    if (!tab) {
      return false;
    }
    tab.loadURI(url);
    return true;
  });
}
