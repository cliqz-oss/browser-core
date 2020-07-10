/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const urls = require('./urls');

module.exports = Object.assign(urls('ghostery.net'), {
  SUPPORT_URL: 'https://www.ghostery.com/support/', // control-center/sources/config.es
  PRIVACY_POLICY_URL: 'https://www.ghostery.com/about-ghostery/privacy-statements/',
  NEW_TAB_URL: '/freshtab/home.html',

  // human-web:
  ENDPOINT_HUMAN_WEB_PATTERNS: 'https://cdn2.ghostery.com/human-web-chromium/hw-patterns.gz',
  ENDPOINT_PATTERNSURL: 'https://cdn2.ghostery.com/human-web-chromium/patterns.gz',
  ENDPOINT_ANONPATTERNSURL: 'https://cdn2.ghostery.com/human-web-chromium/patterns-anon.gz',

  // override anti-tracking to ghostery CDN
  ANTITRACKING_BASE_URL: 'https://cdn.ghostery.com/antitracking',

  // adblocker assets
  ADBLOCKER_BASE_URL: 'https://cdn.ghostery.com/adblocker/configs',
});
