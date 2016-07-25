export function queryActiveTabs(window) {
  const selectedBrowser = window.gBrowser.selectedBrowser;
  return Array.prototype.map.call(window.gBrowser.tabs, (tab, index) => {
    return {
      index,
      url: tab.linkedBrowser.currentURI.spec,
      isCurrent: selectedBrowser === tab.linkedBrowser
    };
  });
}
