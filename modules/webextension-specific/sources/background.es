import { chrome } from '../platform/globals';
import events from '../core/events';
import background from '../core/base/background';
import config from '../core/config';

const onBrowserActionClick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      return;
    }
    if (config.settings.browserAction === 'quicksearch'
      && !tab.url.startsWith('about:')
      && !tab.url.startsWith('chrome:')
    ) {
      chrome.tabs.sendMessage(tab.id, {
        module: 'overlay',
        action: 'toggle-quicksearch',
      });
    } else {
      chrome.tabs.create({});
    }
  });
};

/**
  @namespace webextension-specific
  @module webextension-specific
  @class Background
 */
export default background({
  init() {
    this.isNewTabOverrideEnabled = chrome.browserAction
      && chrome.runtime.getManifest().chrome_url_overrides.newtab;

    if (this.isNewTabOverrideEnabled && !config.settings.OFFERS_BUTTON) {
      chrome.browserAction.onClicked.addListener(onBrowserActionClick);
    }

    this.onTabSelect = ({ tabId }) => {
      chrome.tabs.get(tabId, tabInfo => events.pub('core:tab_select', tabInfo));
    };
    this.onTabClose = (tabId, tabInfo) => events.pub('core:tab_close', tabInfo);
    this.onTabOpen = tabInfo => events.pub('core:tab_open', tabInfo);

    chrome.tabs.onActivated.addListener(this.onTabSelect);
    chrome.tabs.onRemoved.addListener(this.onTabClose);
    chrome.tabs.onCreated.addListener(this.onTabOpen);
  },

  unload() {
    if (this.isNewTabOverrideEnabled && !config.settings.OFFERS_BUTTON) {
      chrome.browserAction.onClicked.removeListener(onBrowserActionClick);
    }

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
