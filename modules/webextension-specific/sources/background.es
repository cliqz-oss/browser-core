/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import runtime from '../platform/runtime';
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
    this.onMessage = (message) => {
      if (message.name === 'appReady') {
        return Promise.resolve({ ready: true });
      }

      return undefined;
    };
    runtime.onMessage.addListener(this.onMessage);

    this.onTabSelect = ({ tabId }) => {
      chrome.tabs.get(tabId, tabInfo => events.pub('core:tab_select', { ...tabInfo, tabId }));
    };
    this.onTabClose = (tabId, removeInfo) => events.pub('core:tab_close', { tabId, ...removeInfo });
    this.onTabOpen = tabInfo => events.pub('core:tab_open', tabInfo);

    chrome.tabs.onActivated.addListener(this.onTabSelect);
    chrome.tabs.onRemoved.addListener(this.onTabClose);
    chrome.tabs.onCreated.addListener(this.onTabOpen);
  },

  unload() {
    runtime.onMessage.removeListener(this.onMessage);
    chrome.tabs.onActivated.removeListener(this.onTabSelect);
    chrome.tabs.onRemoved.removeListener(this.onTabClose);
    chrome.tabs.onCreated.removeListener(this.onTabOpen);
  },

  events: {

  },

  actions: {

  },
});
