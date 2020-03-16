/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const base = require('../common/system');
const urls = require('../common/urls-cliqz');
const settings = require('../common/amo-settings');

module.exports = {
  platform: 'webextension',
  specific: 'amo',
  baseURL: '/modules/',
  pack: 'web-ext build -s build -a .',
  publish: '',
  settings: Object.assign({}, urls, settings, {
    antitrackingProtectionEnabled: false,
    offboardingURLs: {
      en: 'https://cliqz.com/home/offboarding',
    },
    SHOW_ONBOARDING_OVERLAY: true,
    telemetry: {
      demographics: {
        brand: 'cliqz',
        name: 'tab',
        platform: 'firefox',
      },
    },
  }),
  default_prefs: {
    'freshtab.search.mode': 'search',
    'modules.anolysis.enabled': false,
    'modules.browser-panel.enabled': false,
    'modules.offers-templates.enabled': false,
  },
  modules: [
    'core',
    'telemetry',
    'core-cliqz',
    'dropdown',
    'abtests-legacy',
    'geolocation',
    'human-web',
    'freshtab',
    'news',
    'webrequest-pipeline',
    'antitracking',
    'hpnv2',
    'myoffrz-helper',
    'offers-banner',
    'offers-templates',
    'offers-v2',
    'browser-panel',
    'control-center',
    'anolysis',
    'anolysis-cc',
    'search',
    'webextension-specific',
    'onboarding-overlay',
  ],
  bundles: [
    'hpnv2/worker.wasm.bundle.js',
    'hpnv2/worker.asmjs.bundle.js',
    'core/content-script.bundle.js',
    'webextension-specific/app.bundle.js',
    'freshtab/home.bundle.js',
    'dropdown/dropdown.bundle.js',
    'control-center/control-center-react.bundle.js',
    'browser-panel/browser-panel.bundle.js',
    'offers-templates/offers-reminder.bundle.js',
    'offers-templates/offers-checkout.bundle.js',
    'offers-templates/offers-control-center.bundle.js',
    'offers-templates/offers-control-center-after.bundle.js',
    'offers-banner/app.bundle.js',
    'human-web/page.bundle.js',
    'human-web/rusha.bundle.js',
    'onboarding-overlay/app.bundle.js',
  ],
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie'
    }),
  }),
  PRODUCT_PREFIX: 'cliqz',
};
