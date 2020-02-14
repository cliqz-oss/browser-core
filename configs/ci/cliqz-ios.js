/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const urls = require('../common/urls');

module.exports = {
  platform: 'react-native',
  format: 'common',
  baseURL: '/',
  testsBasePath: './build/modules',
  testem_launchers: ['unit-node'],
  testem_launchers_ci: ['unit-node'],
  versionPrefix: '3',
  pack: [
    "(jq '.name=\\\"browser-core-cliqz-ios\\\"' package.json > package-new.json)",
    'mv package.json package-old.json',
    'mv package-new.json package.json',
    'npm pack',
    'mv package-old.json package.json',
  ].join(' && '),
  isMobile: true,
  settings: {
    ...urls,
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    RESULTS_PROVIDER_ORDER: ['calculator', 'history', 'cliqz', 'querySuggestions', 'instant'],
    CLEAR_RESULTS_AT_SESSION_START: false,
    telemetry: {
      demographics: {
        brand: 'cliqz',
        name: 'browser',
        platform: 'ios',
      },
    },
  },
  default_prefs: {
    'modules.pairing.enabled': false,
    developer: true,
    showConsoleLogs: true,
  },
  modules: [
    'core',
    'core-cliqz',
    'search',
    'p2p',
    'pairing',
    'mobile-pairing',
    'mobile-cards',
    'video-downloader',
    'anolysis',
    'telemetry',
    'insights',
    'geolocation'
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
    ]
  }
};
