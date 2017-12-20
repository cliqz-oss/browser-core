// Just a mock, so should be safe. Bootstrap has better way to detect private mode.

export function getTabInfo(tabId, type) {
  const tabInfo = {
    type,
    isWebExtension: false,
    isPrivate: false
  };

  return Promise.resolve(tabInfo);
}

export default getTabInfo;
