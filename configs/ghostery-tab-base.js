/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const urls = require('./common/urls-ghostery');
const base = require('./common/system');

const id = 'ifnpgdmcliingpambkkihjlhikmbbjid';

module.exports = {
  platform: 'webextension',
  specific: 'ghostery-tab',
  baseURL: '/modules/',
  pack: 'web-ext build -s build -a .',
  versionPrefix: '10',
  settings: Object.assign({}, urls, {
    id,
    appName: 'Ghostery',
    name: 'ghosteryTabAppNameNightly',
    channel: 'GT12', // Ghostery Tab Chrome Beta
    MSGCHANNEL: 'ghostery-tab',
    HW_CHANNEL: 'ghostery',
    freshTabNews: true,
    freshTabStats: true,
    browserAction: 'quicksearch',
    OFFERS_CHANNEL: 'ghostery-tab',
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    FRESHTAB_TITLE: 'Ghostery Tab',
    offboardingURLs: {
      en: 'https://www.surveymonkey.de/r/StartTabEng',
      de: 'https://www.surveymonkey.de/r/StartTabDE',
    },
    INSIGHTS_INTERNAL: true,
  }),
  default_prefs: {
    'modules.human-web.enabled': true,
    'modules.hpnv2.enabled': true,
    'freshtab.search.mode': 'search',
    'offers2UserEnabled': false,
  },
  modules: [
    'core',
    'telemetry',
    'core-cliqz',
    'abtests-legacy',
    'geolocation',
    'search',
    'dropdown',
    'freshtab',
    'news',
    'human-web',
    'insights',
    'hpnv2',
    'webrequest-pipeline',
    'webextension-specific',
    'anolysis',
    'anolysis-cc',
    'overlay',
    'control-center',
    'toolbox'
  ],
  bundles: [
    'hpnv2/worker.wasm.bundle.js',
    'hpnv2/worker.asmjs.bundle.js',
    'core/content-script.bundle.js',
    'webextension-specific/app.bundle.js',
    'freshtab/home.bundle.js',
    'dropdown/dropdown.bundle.js',
    'control-center/control-center-react.bundle.js',
    'human-web/rusha.bundle.js',
    'toolbox/toolbox.bundle.js',
  ],
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie',
    }),
  }),
  PRODUCT_PREFIX: 'ghosterytab',
};
