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
const publish = require('./common/publish');

module.exports = {
  platform: 'webextension',
  brocfile: 'Brocfile.webextension.js',
  specific: 'geckoview',
  baseURL: '/modules/',
  pack: 'web-ext build -s build -a .',
  publish: publish.toPrerelease('cliqz', 'cliqz-geckoview', 'zip'),
  sourceMaps: false,
  versionPrefix: '12',
  settings: {
    ...urls,
    channel: 'MA60',
    MSGCHANNEL: 'web-extension',
    ATTRACK_TELEMETRY_PROVIDER: 'hpnv2',
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

    // Enable "auto-trigger" mode, which means that the extension will use the
    // network (e.g. doublefetch, sending messages) without guidance from the browser.
    HUMAN_WEB_LITE_AUTO_TRIGGER: true,

    // Insights interval triggering
    INSIGHTS_INTERNAL: true,
  },
  default_prefs: {
    'modules.webextension-specific.enabled': true,
    'cliqz-adb': 1,
    'cliqz-adb-strict': true,
    attrackBloomFilter: true,
    attrackTelemetryMode: 0,
    attrackDefaultAction: 'placeholder',
    sendAntiTrackingHeader: false,
    attrackCookieTrustReferers: true,
    'attrack.cookieMode': 'trackers',
    attrackBlockCookieTracking: true,
    'modules.cookie-monster.enabled': true,
    'cookie-monster.expireSession': true,
    'cookie-monster.nonTracker': true,
    showConsoleLogs: true,
  },
  bundles: [
    'core/cliqz.bundle.js',
    'core/content-script.bundle.js',
  ],
  modules: [
    'core',
    'antitracking',
    'webrequest-pipeline',
    'adblocker',
    'anolysis',
    'abtests-legacy',
    'webextension-specific',
    'cookie-monster',
    'autoconsent',
    'dat',
    'human-web-lite',
    'insights',
  ],
};
