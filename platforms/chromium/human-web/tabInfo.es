export function getTabInfo(tabId, type) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.get(tabId, (tab) => {
        const tabInfo = {
          type,
          isWebExtension: true,
          isPrivate: tab.incognito
        };
        resolve(tabInfo);
      });
    } catch (ee) {
      reject(ee);
    }
  });
}

export default getTabInfo;
