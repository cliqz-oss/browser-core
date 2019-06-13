import { chrome } from './globals';

export function checkIsWindowActive(tabId) {
  const id = Number(tabId);
  if (isNaN(id) || id < 0) return Promise.resolve(false);

  return new Promise((resolve) => {
    chrome.tabs.get(id, () => {
      if (chrome.runtime.lastError) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}


export default (chrome && chrome.windows) || undefined;
