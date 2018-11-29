import tabs from '../platform/tabs';
import windows from '../platform/windows';

import console from '../core/console';
import { chrome } from '../platform/globals';


export default class PageStore {
  constructor() {
    this.tabs = {};
    this.windows = {};

    this.onTabCreated = this.onTabCreated.bind(this);
    this.onTabUpdated = this.onTabUpdated.bind(this);
    this.onTabRemoved = this.onTabRemoved.bind(this);
    this.onWindowCreated = this.onWindowCreated.bind(this);
    this.onWindowRemoved = this.onWindowRemoved.bind(this);
  }

  init() {
    tabs.onCreated.addListener(this.onTabCreated);
    tabs.onUpdated.addListener(this.onTabUpdated);
    tabs.onRemoved.addListener(this.onTabRemoved);

    // windows API may be undefined on Firefox for Android.
    if (windows) {
      windows.onCreated.addListener(this.onWindowCreated);
      windows.onRemoved.addListener(this.onWindowRemoved);
    }
  }

  unload() {
    tabs.onCreated.removeListener(this.onTabCreated);
    tabs.onUpdated.removeListener(this.onTabUpdated);
    tabs.onRemoved.removeListener(this.onTabRemoved);

    if (windows) {
      windows.onCreated.removeListener(this.onWindowCreated);
      windows.onRemoved.removeListener(this.onWindowRemoved);
    }
  }

  onFullPage({ tabId, url, isPrivate, requestId }) {
    // update last request id from the tab
    if (this.tabs[tabId] === undefined) {
      this.tabs[tabId] = {
        url,
        isPrivate,
      };
    }

    this.tabs[tabId].lastRequestId = requestId;
  }

  isRedirect(details) {
    if (details.type === 'main_frame' && details.parentFrameId === -1) {
      if (details.tabId !== undefined && details.tabId !== null
        && this.tabs[details.tabId] !== undefined) {
        if (details.requestId === this.tabs[details.tabId].lastRequestId) {
          return true;
        }
      }
    }

    return false;
  }

  getWindowStatus(windowId) {
    let isPrivate = null;
    if (windowId) {
      if (!this.windows[windowId]) {
        chrome.windows.get(windowId, (window) => {
          this.windows[window.id] = {
            isPrivate: window.incognito
          };
        });
      } else {
        isPrivate = this.windows[windowId].isPrivate;
      }
    }
    return isPrivate;
  }

  onTabCreated(tab) {
    if (tab.id > -1) {
      this.tabs[tab.id] = {
        url: tab.url,
        isPrivate: tab.incognito,
      };
    }
  }

  onTabUpdated(tabId, changeInfo, tab) {
    if (tabId > -1 && tab.url) {
      if (this.tabs[tabId]) {
        this.tabs[tabId].url = tab.url;
        this.tabs[tabId].isPrivate = tab.incognito;
      } else {
        this.tabs[tabId] = {
          url: tab.url,
          isPrivate: tab.incognito,
        };
      }
    }
  }

  onTabRemoved(tabId) {
    if (tabId > -1) {
      delete this.tabs[tabId];
    }
  }

  onWindowCreated(window) {
    this.windows[window.id] = {
      isPrivate: window.incognito
    };
  }

  onWindowRemoved(windowId) {
    delete this.windows[windowId];
  }

  getSourceURL(details) {
    if (details.type === 'main_frame' && details.parentFrameId === -1) {
      return details.url;
    }

    const { tabId, initiator } = details;
    if (tabId > -1 && tabId in this.tabs) {
      return this.tabs[tabId].url;
    }
    if (tabId !== -1) {
      if (initiator && initiator !== 'null') {
        // Sometimes requests from iframes can have different tabid,
        // try to use `initiator` as the source url
        return initiator;
      }
      console.warn(tabId, this.tabs, 'Cannot locate tabId');
    }

    return null;
  }
}
