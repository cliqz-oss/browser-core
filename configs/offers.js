/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const base = require('./common/system');
const urls = require('./common/urls-myoffrz');
const publish = require('./common/publish');

const id = 'myoffrz-nightly@cliqz.com';


module.exports = {
  platform: 'webextension',
  specific: 'offers',
  baseURL: '/modules/',
  pack: 'web-ext build -s build -a .',
  publish: publish.toPrerelease('myoffrz_nightly_', 'offers_beta', 'zip'),
  settings: Object.assign({}, urls, {
    id,
    name: 'offersAppNameNightly',
    description: 'offersAppDesc',
    'offers.user-journey.enabled': true,
    channel: 'MO02',
    homepageURL: 'https://cliqz.com/',
    OFFERS_CHANNEL: 'myoffrz',
    OFFERS_BRAND: 'myoffrz',
    HW_CHANNEL: 'myoffrz',
    ALLOWED_COUNTRY_CODES: ['de'],
    ONBOARDING_URL: 'https://myoffrz.com/on-boarding/',
    OFFBOARDING_URL: 'https://myoffrz.com/off-boarding/',
    SHOW_ONBOARDING_OVERLAY: true,
  }),
  versionPrefix: '11',
  default_prefs: {
    'modules.browser-panel.enabled': false,
    'modules.offers-cc.enabled': false,
    'modules.offers-reminder.enabled': false,
    'dynamic-offers.enabled': true,
  },
  modules: [
    'core',
    'core-cliqz',
    'abtests-legacy',
    'telemetry',
    'human-web',
    'webrequest-pipeline',
    'browser-panel',
    'hpnv2',
    'myoffrz-helper',
    'offers-banner',
    'offers-cc',
    'offers-reminder',
    'offers-v2',
    'popup-notification',
    'onboarding-overlay',
  ],
  bundles: [
    'browser-panel/browser-panel.bundle.js',
    'browser-panel/debug.bundle.js',
    'core/content-script.bundle.js',
    'hpnv2/worker.wasm.bundle.js',
    'hpnv2/worker.asmjs.bundle.js',
    'human-web/page.bundle.js',
    'human-web/rusha.bundle.js',
    'offers-banner/app.bundle.js',
    'offers-cc/offers-cc.bundle.js',
    'offers-cc/offers-cc-after.bundle.js',
    'offers-reminder/offers-reminder.bundle.js',
    'onboarding-overlay/app.bundle.js',
  ],
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie',
    }),
  }),
  PRODUCT_PREFIX: 'myoffrz',
  PRODUCT_TITLE: 'MyOffrz',
};
