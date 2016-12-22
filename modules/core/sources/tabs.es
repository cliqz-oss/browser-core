export function pinTab(window, tab) {
  let t;
  if (typeof tab.index === "number") {
    t = window.gBrowser.tabs[tab.index];
  } else {
    t = tab;
  }
  if (!t.pinned) {
    window.gBrowser.pinTab(t);
  }
}

export function queryActiveTabs(window) {
  const selectedBrowser = window.gBrowser.selectedBrowser;
  return Array.prototype.map.call(window.gBrowser.tabs, (tab, index) => ({
    index,
    url: tab.linkedBrowser.currentURI.spec,
    isCurrent: selectedBrowser === tab.linkedBrowser,
    isPinned: tab.pinned,
  }));
}
