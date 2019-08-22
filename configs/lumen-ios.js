/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const publish = require('./common/publish');
const urls = require('./common/urls-lumen');

module.exports = {
  platform: 'react-native',
  format: 'common',
  baseURL: '/',
  testsBasePath: './build/modules',
  testem_launchers: ['unit-node'],
  testem_launchers_ci: ['unit-node'],
  versionPrefix: '13',
  versionInfix: '.',
  // pack changes the name in package.json before running npm pack
  pack: [
    "(jq '.name=\\\"browser-core-lumen-ios\\\"' package.json > package-new.json)",
    'mv package.json package-old.json',
    'mv package-new.json package.json',
    'npm pack',
    'mv package-old.json package.json',
  ].join(' && '),
  publish: publish.toEdge('browser-core-lumen-ios', 'lumen-ios'),
  isMobile: true,
  settings: Object.assign({}, urls, {
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    RESULTS_PROVIDER_ORDER: ['calculator', 'history', 'cliqz', 'querySuggestions'],
    CLEAR_RESULTS_AT_SESSION_START: false,
    'search.config.providers.instant.isEnabled': false,
  }),
  modules: [
    'core',
    'core-cliqz',
    'search',
    'mobile-cards',
    'mobile-cards-vertical',
    'video-downloader',
    'anolysis',
    'telemetry',
    'insights',
    'geolocation',
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
