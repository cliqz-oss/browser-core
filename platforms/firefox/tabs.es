/* globals PrivateBrowsingUtils */
import { isWindowActive } from './windows';
import { waitForAsync } from '../core/helpers/wait';
import { Services, Components } from './globals';

try {
  Components.utils.import('resource://gre/modules/PrivateBrowsingUtils.jsm');
} catch (e) { /* */ }

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

  return waitForAsync(() => {
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
    numTabId === tab.linkedBrowser.outerWindowID
  );

  if (tabToRemove === undefined) {
    return Promise.reject(`Could not find tab ${tabId}`);
  }

  // Remove tab
  gBrowser.removeTab(tabToRemove);

  return waitForAsync(() => !isWindowActive(numTabId));
}

function getCurrentTab() {
  const gBrowser = getCurrentgBrowser();
  return [...gBrowser.tabs].find(tab => gBrowser.selectedBrowser === tab.linkedBrowser);
}

export async function getCurrentTabId() {
  const tab = await getCurrentTab();
  return tab.linkedBrowser.outerWindowID;
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

export function updateCurrentTab(url) {
  const tab = getCurrentTab();
  return updateTab(tab.outerWindowID, url);
}

export function getTab(tabId) {
  const numTabId = Number(tabId);
  const gBrowser = getCurrentgBrowser();
  const tabToUpdate = [...gBrowser.tabs].find(tab =>
    numTabId === tab.linkedBrowser.outerWindowID
  );
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
