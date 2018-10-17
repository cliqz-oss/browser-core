/* eslint-disable */

'use strict';

const base = require('./common/system');
const urls = require('./common/urls-cliqz');
const settings = require('./common/amo-settings');
const subprojects = require('./common/subprojects/bundles');

module.exports = {
  "platform": "webextension",
  "specific": "amo",
  "baseURL": "/modules/",
  "pack": "web-ext build -s build -a .",
  'publish': '',
  'settings': Object.assign({}, urls, settings, {
    'ICONS': {
      'active': {
        'default': 'control-center/images/cc-active-16.png',
        'dark': 'control-center/images/cc-active-dark-16.png'
      },
      'inactive': {
        'default': 'control-center/images/cc-critical.svg',
        'dark': 'control-center/images/cc-critical-dark.svg'
      },
      'critical': {
        'default': 'control-center/images/cc-critical-16.png',
        'dark': 'control-center/images/cc-critical-dark-16.png'
      }
    },
  }),
  'default_prefs' : {
    'modules.history-analyzer.enabled': false,
    'modules.anolysis.enabled': false,
    showConsoleLogs: true,
    'modules.browser-panel.enabled': false,
  },
  "modules": [
    'core',
    'core-cliqz',
    'dropdown',
    'static',
    'geolocation',
    //'ui',
    'last-query',
    'human-web',
    'anti-phishing',
    'omnibox',
    // 'context-menu',
    'freshtab',
    'webrequest-pipeline',
    'antitracking',
    'performance',
    'hpn',
    'control-center',
    'offers-v2',
    'offers-banner',
    'popup-notification',
    // 'history-analyzer', TODO
    // 'offers-cc',
    'browser-panel',
    'message-center',
    'offboarding',
    'anolysis',
    'anolysis-cc',
    'market-analysis',
    'abtests',
    'search',
    'myoffrz-helper',
    // 'hpnv2',
    'webextension-specific',
  ],
  "subprojects": subprojects([
    '@cliqz-oss/dexie',
    '@cliqz/adblocker',
    'pouchdb',
    'ajv',
    'handlebars',
    'jquery',
    'mathjs',
    'moment',
    'moment-range',
    'pako',
    'react',
    'reactDom',
    'rxjs',
    'simple-statistics',
    'tldts',
    'tooltipster-css',
    'tooltipster-js',
    'tooltipster-sideTip-theme',
    'ua-parser-js',
    'jsep',
  ]),
  "bundles": [
    "hpn/worker.bundle.js",
    "core/content-script.bundle.js",
    "webextension-specific/app.bundle.js",
    "freshtab/home.bundle.js",
    "dropdown/dropdown.bundle.js",
    "control-center/control-center.bundle.js",
    "browser-panel/browser-panel.bundle.js",
  ],
  system: Object.assign({}, base.systemConfig, {
    map: Object.assign({}, base.systemConfig.map, {
      "ajv": "node_modules/ajv/dist/ajv.min.js",
      "jsep": "modules/vendor/jsep.min.js",
    })
  }),
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie', 'pouchdb', 'rxjs'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie',
      'pouchdb': 'PouchDB',
      'pouchdb/lib/index.js': 'PouchDB',
      'rxjs': 'Rx',
      'rxjs/Rx.js': 'Rx',
    }),
  })
}
