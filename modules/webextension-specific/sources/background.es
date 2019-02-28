import { chrome } from '../platform/globals';
import events from '../core/events';
import background from '../core/base/background';

/**
  @namespace webextension-specific
  @module webextension-specific
  @class Background
 */
export default background({
  init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.name === 'appReady') {
        sendResponse({ ready: true });
      }
    });

    this.onTabSelect = ({ tabId }) => {
      chrome.tabs.get(tabId, tabInfo => events.pub('core:tab_select', { ...tabInfo, tabId }));
    };
    this.onTabClose = (tabId, removeInfo) => events.pub('core:tab_close', Object.assign({ tabId }, removeInfo));
    this.onTabOpen = tabInfo => events.pub('core:tab_open', tabInfo);

    chrome.tabs.onActivated.addListener(this.onTabSelect);
    chrome.tabs.onRemoved.addListener(this.onTabClose);
    chrome.tabs.onCreated.addListener(this.onTabOpen);
  },

  unload() {
    chrome.tabs.onActivated.removeListener(this.onTabSelect);
    chrome.tabs.onRemoved.removeListener(this.onTabClose);
    chrome.tabs.onCreated.removeListener(this.onTabOpen);
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  },
});
