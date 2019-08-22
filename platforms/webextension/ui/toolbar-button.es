/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
