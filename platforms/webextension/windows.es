import { chrome } from './globals';

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


export default chrome.windows;
