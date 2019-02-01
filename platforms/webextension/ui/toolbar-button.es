export default class {
  constructor(options = {}) {
    this.defaults = {
      popup: options.default_popup || ''
    };
  }

  build() {
    chrome.browserAction.setPopup({
      popup: this.defaults.popup,
    });
  }

  setPositionBeforeElement() {}

  addWindow() {}

  setIcon(tabId, value) {
    chrome.browserAction.setIcon({
      path: {
        16: value,
        48: value,
        128: value
      },
      tabId
    });
  }

  setBadgeBackgroundColor(tabId, color) {
    chrome.browserAction.setBadgeBackgroundColor({ color, tabId });
  }

  removeWindow() {}

  shutdown() {}

  setBadgeText(tabId, text) {
    chrome.browserAction.setBadgeText({ text, tabId }, () => {
      if (chrome.runtime.lastError) {
        // tab probably no longer exists
      }
    });
  }

  resizePopup() {
  }
}
