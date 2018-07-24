import { chrome } from './globals';


export function newTab(url, active = false) {
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
  return new Promise((resolve) => {
    chrome.tabs.onRemoved.addListener(function onTabRemoved(id) {
      if (id === tabId) {
        resolve();
        chrome.tabs.onRemoved.removeListener(onTabRemoved);
      }
    });
    // QUESTION: somehow callback to tabs.remove fire too fast so we use onRemove listener
    chrome.tabs.remove(Number(tabId));
  });
}


export function updateTab(tabId, url) {
  return new Promise((resolve) => {
    chrome.tabs.update(Number(tabId), { url }, resolve);
  });
}

export function getTab() {
}

export default chrome.tabs;
