/* eslint-disable */

'use strict';

const base = require('./common/system');
const urls = require('./common/urls-cliqz');
const settings = require('./common/offers-settings');
const publish = require('./common/publish');

const id = 'myoffrz-nightly@cliqz.com';


module.exports = {
  'platform': 'webextension',
  'specific': 'offers',
  'baseURL': '/modules/',
  'pack': 'web-ext build -s build -a .',
  'publish': publish.toPrerelease('myoffrz_nightly_', 'offers_beta', 'zip'),
  'settings': Object.assign({}, urls, settings, {
    'name': 'offersAppNameNightly',
    'offers.user-journey.enabled': true,
    id
  }),
  versionInfix: '.',
  versionPrefix: '11',
  'default_prefs': {
    developer: true,
    showConsoleLogs: true,
    'modules.browser-panel.enabled': false,
    'modules.offers-cc.enabled': false,
    'modules.history-analyzer.enabled': false,
  },
  'modules': [
    'core',
    'core-cliqz',
    'abtests-legacy',
    'telemetry',
    'webrequest-pipeline',
    'anolysis',
    'browser-panel',
    'history-analyzer',
    'hpnv2',
    'market-analysis',
    'myoffrz-helper',
    'offers-banner',
    'offers-cc',
    'offers-v2',
    'popup-notification'
  ],
  'bundles': [
    'browser-panel/browser-panel.bundle.js',
    'core/content-script.bundle.js',
    'hpnv2/worker.wasm.bundle.js',
    'hpnv2/worker.asmjs.bundle.js',
    'offers-banner/app.bundle.js',
    'offers-cc/offers-cc.bundle.js',
  ],
  system: Object.assign({}, base.systemConfig, {
    map: Object.assign({}, base.systemConfig.map, {
      'jsep': 'modules/vendor/jsep.min.js',
    })
  }),
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie',
    }),
  }),
  OFFERS_PRODUCT_PREFIX: 'myoffrz',
  OFFERS_PRODUCT_TITLE: 'MyOffrz',
}
