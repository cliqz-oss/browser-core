import { chrome } from '../platform/globals';
import background from '../core/base/background';

const onBrowserActionClick = () => {
  chrome.tabs.create({
  });
};

/**
  @namespace webextension-specific
  @module webextension-specific
  @class Background
 */
export default background({
  init() {
    this.isNewTabOverrideEnabled = chrome.browserAction &&
      chrome.runtime.getManifest().chrome_url_overrides.newtab;

    if (this.isNewTabOverrideEnabled) {
      chrome.browserAction.onClicked.addListener(onBrowserActionClick);
    }
  },

  unload() {
    if (this.isNewTabOverrideEnabled) {
      chrome.browserAction.onClicked.removeListener(onBrowserActionClick);
    }
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  },
});
