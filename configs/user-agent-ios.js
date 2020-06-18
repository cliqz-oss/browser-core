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
  versionPrefix: '3',
  pack: [
    `(jq '.name=\\"browser-core-user-agent-ios\\" | .version=\\"${process.env.VERSION}\\"' package.json > package-new.json)`,
    'mv package.json package-old.json',
    'mv package-new.json package.json',
    'npm pack',
    'mv package-old.json package.json',
  ].join(' && '),
  publish: publish.toEdge('browser-core-user-agent-ios', 'user-agent-ios'),
  isMobile: true,
  settings: Object.assign({}, urls, {
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    RESULTS_PROVIDER_ORDER: ['calculator', 'history', 'cliqz', 'querySuggestions', 'instant'],
    CLEAR_RESULTS_AT_SESSION_START: false,

    // Available proxies are: https://proxy[1-100].(cliqz|humanweb).foxyproxy.com
    HUMAN_WEB_LITE_COLLECTOR_VIA_PROXY: 'https://proxy*.cliqz.foxyproxy.com',
    HUMAN_WEB_LITE_COLLECTOR_DIRECT: 'https://collector-hpn.cliqz.com',
    HW_CHANNEL: 'ios',

    telemetry: {
      demographics: {
        brand: 'cliqz',
        name: 'browser',
        platform: 'ios',
      },
    },
  }),
  default_prefs: {
  },
  modules: [
    'core',
    'human-web-lite',
    'hpn-lite',
    'search',
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
      'core/tracker_db_v2.json',
    ]
  }
};
