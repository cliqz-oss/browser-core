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
const publish = require('./common/publish');

module.exports = {
  platform: 'webextension',
  brocfile: 'Brocfile.privacy.js',
  specific: 'privacy',
  baseURL: '/modules/',
  pack: 'web-ext build -s build -a .',
  publish: publish.toPrerelease('cliqz_privacy', 'cliqz_privacy', 'zip'),
  sourceMaps: false,
  versionPrefix: '12',
  settings: {
    ...urls,
    channel: 'MA60',
    MSGCHANNEL: 'web-extension',
    OFFERS_CHANNEL: 'ghostery',
    ATTRACK_TELEMETRY_PROVIDER: 'hpnv2',
    ADBLOCKER_PLATFORM: 'desktop',
    HW_CHANNEL: 'ghostery',
    antitrackingPlaceholder: 'ghostery',
    antitrackingHeader: 'Ghostery-AntiTracking',
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
  },
  bundles: [
    'webextension-specific/app.bundle.js',
    'core/content-script.bundle.js',
  ],
  modules: [
    'core',
    'antitracking',
    'webrequest-pipeline',
    'adblocker',
    'anolysis',
    'core-cliqz',
    'abtests-legacy',
    'webextension-specific',
    'telemetry',
    'cookie-monster',
    'autoconsent',
    'dat',
  ],
};
