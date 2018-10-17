import { chrome } from './globals';
import { getActiveTab } from './browser';

export function newTab(url, { focus = true } = {}) {
  let resolver;
  const promise = new Promise((resolve) => {
    resolver = resolve;
  });
  chrome.tabs.create(
    { url, active: focus },
    (tab) => { resolver(tab.id); },
  );
  return promise;
}

export async function getCurrentTabId(/* window */) {
  const activeTab = await getActiveTab();
  return activeTab.id;
}

export function queryTabs() {
  return chrome.tabs.query({});
}

export function queryActiveTabs() {
  // TODO
  return [];
}

export function getTabsWithUrl(/* window, url */) {
  throw new Error('not implemented');
}

export function getCurrentgBrowser() {
  throw new Error('getCurrentgBrowser() is not implemented!');
}

export function closeTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.onRemoved.addListener(function onTabRemoved(id) {
      if (id === tabId) {
        resolve();
        chrome.tabs.onRemoved.removeListener(onTabRemoved);
      }
    });
    // QUESTION: somehow callback to tabs.remove fire too fast so we use onRemove listener
    const removePromise = chrome.tabs.remove(Number(tabId), () => {
      if (chrome.runtime.lastError) {
        reject(new Error(`tab with id '${tabId}' is missing, probably already closed.`));
      }
    });

    if (removePromise && removePromise.catch) {
      removePromise.catch(reject);
    }
  });
}

function getCurrentTab(id) {
  const windowId = typeof id === 'number' ? id : chrome.windows.WINDOW_ID_CURRENT;
  return chrome.tabs.query({ windowId, active: true });
}

export function closeTabsWithUrl(url) {
  return new Promise((resolve) => {
    chrome.tabs.query({ url }, (tabs) => {
      Promise.all(tabs.map(tab => closeTab(tab.id))).then(resolve);
    });
  });
}

export async function updateTab(tabId, url) {
  let id = tabId;
  if (typeof id !== 'number') {
    const tab = await getCurrentTab();
    id = tab.id;
  }
  return new Promise((resolve) => {
    chrome.tabs.update(tabId, { url }, resolve);
  });
}

export async function updateCurrentTab(url) {
  const tab = await getCurrentTab();
  return updateTab(tab.id, url);
}

export function getTab(tabId) {
  return new Promise((resolve, reject) =>
    chrome.tabs.get(tabId, (tab) => {
      if (tab) {
        resolve(tab);
      } else {
        reject('tab not found');
      }
    })
  );
}

export function query(queryInfo) {
  return new Promise((resolve) => {
    chrome.tabs.query(queryInfo, resolve);
  });
}

export default chrome.tabs;
