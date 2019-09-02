/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { registerContentScript } from '../core/content/register';

registerContentScript({
  module: 'content-script-tests',
  matches: [
    'http://example.com/',
  ],
  excludeMatches: [
    'http://example.com/*?foo=42',
  ],
  // TODO - check all_frames
  // TODO - check match_about_blank
  js: [
    (window, _, CLIQZ) => {
      const testModule = CLIQZ.app.modules['content-script-tests'];
      testModule.action('contentScriptRan', testModule.state);

      return {
        action1: (...args) => CLIQZ.app.modules['content-script-tests'].action('getSomeValue', ...args),
      };
    },
  ],
});
