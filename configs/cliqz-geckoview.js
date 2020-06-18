/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Privacy config:
 * Privacy components (anti-tracking, adblocker etc) as a webextension for the Geckoview platform.
 */
const urls = require('./common/urls-cliqz');
const configBase = require('./geckoview');
const publish = require('./common/publish');

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrerelease('cliqz', 'cliqz-geckoview', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    ...urls,
    channel: 'MA60',
    antitrackingPlaceholder: 'cliqz.com/tracking',
    antitrackingHeader: 'CLIQZ-AntiTracking',
    telemetry: {
      demographics: {
        brand: 'cliqz',
        name: 'browser',
        platform: 'android',
      },
    },
    // Human Web Lite:
    // Available proxies are: https://proxy[1-100].(cliqz|humanweb).foxyproxy.com
    HUMAN_WEB_LITE_COLLECTOR_VIA_PROXY: 'https://proxy*.cliqz.foxyproxy.com',
    HUMAN_WEB_LITE_COLLECTOR_DIRECT: 'https://collector-hpn.cliqz.com',
    HW_CHANNEL: 'android',
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
  }),
});
