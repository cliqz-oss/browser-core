/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const urls = require('./common/urls-ghostery');
const publish = require('./common/publish');

module.exports = {
  platform: 'webextension',
  brocfile: 'Brocfile.ghostery.js',
  baseURL: '/cliqz/',
  pack: 'npm pack',
  publish: publish.toEdge('browser-core', 'ghostery'),
  sourceMaps: false,
  format: 'common',
  settings: Object.assign({}, urls, {
    channel: 'CH80',
    MSGCHANNEL: 'web-extension',
    OFFERS_CHANNEL: 'ghostery',
    ENABLE_OFFER_COLLECTIONS: false,
    MAX_GROUPS_IN_OFFER_COLLECTIONS: 3,
    ATTRACK_TELEMETRY_PROVIDER: 'hpnv2',
    HW_CHANNEL: 'ghostery',
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'be', 'se', 'dk', 'fi', 'cz', 'gr', 'hu', 'ro', 'no', 'ca', 'au', 'ru', 'ua', 'in', 'pl', 'jp', 'br', 'mx', 'cn', 'ar'],
    antitrackingPlaceholder: 'ghostery',
    antitrackingHeader: 'Ghostery-AntiTracking',
    telemetry: {
      demographics: {
        brand: 'ghostery',
        name: 'extension',
      },
    },
  }),
  default_prefs: {
    'modules.human-web.enabled': true,
    'modules.offers-v2.enabled': true,
    'modules.antitracking.enabled': true,
    'modules.anti-phishing.enabled': false,
    'modules.adblocker.enabled': true,
    'modules.insights.enabled': false,
    offersLogsEnabled: true,
    'cliqz-adb': 1,
    attrackBloomFilter: true,
    humanWeb: true,
    'cliqz-anti-phishing': true,
    'cliqz-anti-phishing-enabled': true,
    attrackTelemetryMode: 1,
    attrackDefaultAction: 'placeholder',
    sendAntiTrackingHeader: false,
    telemetry: false,
    attrackCookieTrustReferers: true,
    'attrack.cookieMode': 'ghostery',
    'modules.offers-templates.enabled': false,
  },
  bundles: [
    'core/content-script.bundle.js',
    'hpnv2/worker.wasm.bundle.js',
    'hpnv2/worker.asmjs.bundle.js',
    'human-web/rusha.bundle.js',
    'offers-templates/offers-reminder.bundle.js',
    'offers-templates/offers-checkout.bundle.js',
    'offers-templates/offers-control-center.bundle.js',
    'offers-templates/offers-control-center-after.bundle.js',
  ],
  modules: [
    'core',
    'human-web',
    'hpnv2',
    'antitracking',
    'webrequest-pipeline',
    'offers-v2',
    'offers-banner',
    'offers-templates',
    'adblocker',
    'anolysis',
    'anti-phishing',
    'myoffrz-helper',
    'insights',
  ],
  buildTargets: {
    firefox: 52,
  },
};
