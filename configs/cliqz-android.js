/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const publish = require('./common/publish');
const urls = require('./common/urls-cliqz');

module.exports = {
  platform: 'react-native',
  format: 'common',
  baseURL: '/',
  testsBasePath: './build/modules',
  testem_launchers: ['unit-node'],
  testem_launchers_ci: ['unit-node'],
  pack: 'npm pack',
  publish: publish.toEdge('browser-core', 'cliqz-android'),
  isMobile: true,
  settings: Object.assign({}, urls, {
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    RESULTS_PROVIDER_ORDER: ['calculator', 'history', 'cliqz', 'querySuggestions', 'instant'],
    CLEAR_RESULTS_AT_SESSION_START: false,
    antitrackingButton: false,
    ATTRACK_TELEMETRY_PROVIDER: 'platform',
    channel: 'MR00',
    antitrackingPlaceholder: 'cliqz.com/tracking',
    antitrackingHeader: 'CLIQZ-AntiTracking',
    INSIGHTS_INTERNAL: true,
  }),
  default_prefs: {
    attrackBloomFilter: true,
    attrackForceBlock: true,
    'cliqz-adb': 0,
    'cliqz-adb-disk-cache': false,
    'modules.pairing.enabled': false,
    attrackTelemetryMode: 0,
  },
  modules: [
    'core',
    'core-cliqz',
    'search',
    'webrequest-pipeline',
    'antitracking',
    'adblocker',
    'p2p',
    'pairing',
    'mobile-pairing',
    'mobile-cards',
    'video-downloader',
    'anolysis',
    'geolocation',
    'insights',
  ],
  bundles: [
  ],
  react_components: {
    ExtensionApp: './modules/mobile-cards/cliqz-ios/ExtensionApp'
  },
  resources: {
    bundling: 'assets',
    include: [
      'core/logo-database.json',
      'antitracking/prob.json',
      'antitracking/config.json',
      'antitracking/tracker_db_v2.json',
    ]
  }
};
