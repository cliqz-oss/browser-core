import { chrome } from './globals';


export function newTab(url, active = true) {
  let resolver;
  const promise = new Promise((resolve) => {
    resolver = resolve;
  });
  chrome.tabs.create(
    { url, active },
    (tab) => { resolver(tab.id); },
  );
  return promise;
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


export function updateTab(tabId, url) {
  return new Promise((resolve) => {
    chrome.tabs.update(Number(tabId), { url }, resolve);
  });
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
