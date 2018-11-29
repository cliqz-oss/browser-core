export function getTabInfo(tabId, type) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          reject(new Error(`Could not find tabId=${tabId}, type=${type}. `
                 + 'Either the id is wrong or the tab was closed. '
                 + `(lastError: ${chrome.runtime.lastError})`));
        } else {
          const tabInfo = {
            type,
            isWebExtension: true,
            isPrivate: tab.incognito
          };
          resolve(tabInfo);
        }
      });
    } catch (ee) {
      reject(ee);
    }
  });
}

export default getTabInfo;
