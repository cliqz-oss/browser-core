import tabs from '../platform/tabs';
import windows from '../platform/windows';

import console from '../core/console';
import { chrome } from '../platform/globals';


export default class {
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

    windows.onCreated.addListener(this.onWindowCreated);
    windows.onRemoved.addListener(this.onWindowRemoved);
  }

  unload() {
    tabs.onCreated.removeListener(this.onTabCreated);
    tabs.onUpdated.removeListener(this.onTabUpdated);
    tabs.onRemoved.removeListener(this.onTabRemoved);

    windows.onCreated.removeListener(this.onWindowCreated);
    windows.onRemoved.removeListener(this.onWindowRemoved);
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
      if (details.tabId && this.tabs[details.tabId] !== undefined) {
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
    console.log('add new tab', tab.id);
    if (tab.id) {
      this.tabs[tab.id] = {
        url: tab.url,
        isPrivate: tab.incognito,
      };
    }
  }

  onTabUpdated(tabId, changeInfo, tab) {
    console.log('update tab', tabId);
    if (tabId && tab.url) {
      if (this.tabs[tabId]) {
        this.tabs[tabId].url = tab.url;
        this.tabs[tabId].isPrivate = tab.incognito;
      } else {
        this.tabs[tabId] = {
          url: tab.url,
          isPrivate: tab.incognito,
        };
      }
      console.log('tab updated', tabId, tab.url);
    }
    console.log(this.tabs);
  }

  onTabRemoved(tabId) {
    if (tabId) {
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

    const tabId = details.tabId;
    if (tabId && tabId in this.tabs) {
      return this.tabs[tabId].url;
    } else if (tabId !== -1) {
      console.log(tabId, this.tabs, 'Cannot locate tabId');
    }

    return null;
  }
}
