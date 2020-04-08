/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// eslint-disable-next-line
'use strict';

(function setup() {
  const theme = localStorage.theme;
  if (theme) {
    document.body.classList.add(['theme-', theme].join(''));
  }

  if (chrome.extension
    && chrome.extension.getBackgroundPage
    && !location.hash.startsWith('#ntp')
  ) {
    const bg = chrome.extension.getBackgroundPage();
    if (!bg || !bg.CLIQZ || !bg.CLIQZ.app) {
      return;
    }

    if (bg.CLIQZ.app.prefs.get('freshtab.search.autofocus', false)
      && bg.CLIQZ.app.config.settings.channel !== '99'
    ) {
      const url = new URL(location.href);
      url.hash = '#ntp';
      chrome.tabs.create({ url: url.href });
      chrome.tabs.getCurrent((tab) => {
        chrome.tabs.remove(tab.id);
      });
    }
  }
}());
