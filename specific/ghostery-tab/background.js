/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global CLIQZ */
const app = CLIQZ.app;

chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) {
      if (app.config.settings.browserAction === 'quicksearch'
        && !tab.url.startsWith('about:')
        && !tab.url.startsWith('chrome:')
        && !tab.url.startsWith('moz-extension')
        && !tab.url.startsWith('chrome-extension')
      ) {
        chrome.tabs.sendMessage(tab.id, {
          module: 'overlay',
          action: 'toggle-quicksearch',
          trigger: 'ByMouse',
        });
      } else {
        chrome.tabs.create({});
      }
    }
  });
});
