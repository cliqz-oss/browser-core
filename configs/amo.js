/* eslint-disable */

'use strict';

const base = require('./common/system');
const urls = require('./common/urls-cliqz');
const settings = require('./common/amo-settings');

const subprojects = require('./common/subprojects/bundles');

module.exports = {
  'platform': 'firefox',
  'baseURL': 'resource://cliqz/',
  'testsBasePath': './build/cliqz@cliqz.com/chrome/content',
  'testem_launchers': ['unit-node', 'Chrome'],
  'testem_launchers_ci': ['unit-node'],
  'pack': 'cd build && fab package:version=$VERSION,cert_path=$CLIQZ_CERT_PATH,cert_pass_path=$CLIQZ_CERT_PASS_PATH',
  'publish': 'cd build && fab publish:beta=$CLIQZ_BETA,channel=$CLIQZ_CHANNEL,pre=$CLIQZ_PRE_RELEASE,version=$VERSION,cert_path=$CLIQZ_CERT_PATH,cert_pass_path=$CLIQZ_CERT_PASS_PATH',
  'settings': Object.assign({}, urls, settings, {
    'ICONS': {
      'active': {
        'default': 'control-center/images/cc-active.svg',
        'dark': 'control-center/images/cc-active-dark.svg'
      },
      'inactive': {
        'default': 'control-center/images/cc-critical.svg',
        'dark': 'control-center/images/cc-critical-dark.svg'
      },
      'critical': {
        'default': 'control-center/images/cc-critical.svg',
        'dark': 'control-center/images/cc-critical-dark.svg'
      }
    },
  }),
  'default_prefs' : {
    'modules.history-analyzer.enabled': false,
    'modules.anolysis.enabled': false,
  },
  'modules': [
    'core',
    'core-cliqz',
    'dropdown',
    'firefox-specific',
    'static',
    'geolocation',
    'ui',
    'last-query',
    'human-web',
    'anti-phishing',
    'context-menu',
    'freshtab',
    'webrequest-pipeline',
    'antitracking',
    'performance',
    'hpn',
    'control-center',
    'offers-v2',
    'popup-notification',
    'history-analyzer',
    'offers-cc',
    'browser-panel',
    'message-center',
    'offboarding',
    'anolysis',
    'anolysis-cc',
    'market-analysis',
    'abtests',
    'search',
    'myoffrz-helper',
    'hpnv2',
    "terms-and-conditions"
  ],
  'subprojects': subprojects([
    '@cliqz-oss/dexie',
    'pouchdb',
    '@cliqz/adblocker',
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
  systemDefault: base.systemConfig,
  builderDefault: base.builderConfig,
  bundleConfigs: Object.assign({}, base.appBundleConfig),
};
