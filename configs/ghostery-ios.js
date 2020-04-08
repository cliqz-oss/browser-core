/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const publish = require('./common/publish');
const urls = require('./common/urls-ghostery');

module.exports = {
  platform: 'react-native',
  format: 'common',
  baseURL: '/',
  testsBasePath: './build/modules',
  testem_launchers: ['unit-node'],
  testem_launchers_ci: ['unit-node'],
  pack: 'npm pack',
  publish: publish.toEdge('browser-core', 'ghostery-ios'),
  isMobile: true,
  settings: Object.assign({}, urls, {
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    RESULTS_PROVIDER_ORDER: ['calculator', 'history', 'cliqz', 'querySuggestions', 'instant'],
    CLEAR_RESULTS_AT_SESSION_START: false,
    telemetry: {
      demographics: {
        brand: 'ghostery',
        name: 'browser',
        platform: 'ios',
      },
    },
  }),
  default_prefs: {
    'modules.insights.enabled': false,
  },
  modules: [
    'core',
    'search',
    'video-downloader',
    'anolysis',
    'geolocation',
    'insights',
  ],
  bundles: [
  ],
  resources: {
    bundling: 'assets',
    include: [
      'core/logo-database.json',
    ]
  }
};
