/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { registerContentScript } from '../core/content/register';

registerContentScript({
  module: 'onboarding-v4',
  matches: [
    'http://cliqz.com/*',
    'https://cliqz.com/*',
  ],
  js: [
    (window, chrome, CLIQZ) => {
      CLIQZ.app.modules['core-cliqz'].action('getSupportInfo')
        .then((info) => {
          if (localStorage) {
            localStorage.setItem('extension-info', JSON.stringify(info));
          }
        });
    },
  ],
});
