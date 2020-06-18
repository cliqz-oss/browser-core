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
const urls = require('./common/urls-ghostery');
const configBase = require('./geckoview');
const publish = require('./common/publish');

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrerelease('cliqz', 'ghostery-geckoview', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    ...urls,
    channel: 'MA60',
    antitrackingPlaceholder: 'ghostery',
    antitrackingHeader: 'Ghostery-AntiTracking',
    telemetry: {
      demographics: {
        brand: 'ghostery',
        name: 'browser',
        platform: 'android',
      },
    },
    // Human Web Lite:
    HUMAN_WEB_LITE_COLLECTOR_VIA_PROXY: 'https://collector-hpn.ghostery.net',
    HUMAN_WEB_LITE_COLLECTOR_DIRECT: 'https://collector-hpn.ghostery.net',
    HW_CHANNEL: 'android',
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'be', 'se', 'dk', 'fi', 'cz', 'gr', 'hu', 'ro', 'no', 'ca', 'au', 'ru', 'ua', 'in', 'pl', 'jp', 'br', 'mx', 'cn', 'ar'],
  }),
});
