/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */

import { registerContentScript } from '../core/content/register';

const WARNINGURL = chrome.runtime.getURL('/modules/anti-phishing/phishing-warning.html?u=');

registerContentScript({
  module: 'anti-phishing',
  matches: [
    'http://*/*',
    'https://*/*',
  ],
  js: [
    (window, chrome, CLIQZ) => {
      CLIQZ.app.modules['anti-phishing']
        .action('isPhishingURL', window.location.href)
        .then(({ block, type }) => {
          if (block && type === 'phishingURL') {
            // eslint-disable-next-line no-param-reassign
            window.location = `${WARNINGURL}${encodeURIComponent(window.location)}`;
          }
        });
    },
  ]
});
