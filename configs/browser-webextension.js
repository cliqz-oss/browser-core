/* eslint-disable */

'use strict';

const base = require('./common/system');
const urls = require('./common/urls-cliqz');
const settings = require('./common/amo-settings');

module.exports = {
  "platform": "webextension",
  "specific": "browser",
  "baseURL": "/modules/",
  "pack": "web-ext build -s build -a .",
  'publish': '',
  'settings': Object.assign({}, urls, settings, {
    "id": "cliqz@cliqz.com",
    "name": "Cliqz",
    "channel": "40",
    "homepageURL": "https://cliqz.com/",
    "freshTabNews": true,
    "freshTabStats": true,
    "showDataCollectionMessage": false,
    "helpMenus": true,
    "showNewBrandAlert": true,
    "suggestions": false,
    "onBoardingVersion": "3.0",
    "ENDPOINT_ANONPATTERNSURL": "https://cdn.cliqz.com/browser-f/patterns-anon",
    "ENDPOINT_PATTERNSURL": "https://cdn.cliqz.com/browser-f/patterns",
    "HW_CHANNEL": "cliqz",
    "NEW_TAB_URL": "resource://cliqz/freshtab/home.html",
    "ONBOARDING_URL": "resource://cliqz/onboarding-v3/index.html",
    "HISTORY_URL": "resource://cliqz/cliqz-history/index.html#/",
    "modules.history.search-path": "?query=",
    "ICONS": {
      "active": {
        "default": "control-center/images/cc-active.svg",
        "dark": "control-center/images/cc-active-dark.svg"
      },
      "inactive": {
        "default": "control-center/images/cc-critical.svg",
        "dark": "control-center/images/cc-critical-dark.svg"
      },
      "critical": {
        "default": "control-center/images/cc-critical.svg",
        "dark": "control-center/images/cc-critical-dark.svg"
      }
    },
    "BACKGROUNDS": {
      "active": "#471647",
      "critical": "#471647"
    },
    "ATTRACK_TELEMETRY_PROVIDER": "hpnv2",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "antitrackingPlaceholder": "cliqz.com/tracking",
    "antitrackingHeader": "CLIQZ-AntiTracking",
    "FRESHTAB_TITLE": "Cliqz Tab",
  }),
  'default_prefs' : {
    "modules.context-search.enabled": false,
    "modules.history.enabled": false,
    "modules.type-filter.enabled": false,
    "modules.antitracking-blocker.enabled": false,
    "modules.history-analyzer.enabled": false,
    "proxyPeer": false,
    "proxyTrackers": false,
    "modules.cookie-monster.enabled": true,
    "modules.browser-panel.enabled": false,
    "modules.offers-cc.enabled": false
  },
  "modules": [
    'core',
    'core-cliqz',
    'dropdown',
    'webextension-specific',
    'static',
    'geolocation',
    //'ui',
    'last-query',
    'human-web',
    'anti-phishing',
    // 'context-menu',
    'freshtab',
    'antitracking',
    'omnibox',
    'webrequest-pipeline',
    'performance',
    'hpnv2',
    'control-center',
    'offers-banner',
    'offers-cc',
    'offers-v2',
    'popup-notification',
    'history-analyzer',
    'browser-panel',
    'message-center',
    'offboarding',
    'anolysis',
    'anolysis-cc',
    'abtests',
    'market-analysis',
    'search',
    'myoffrz-helper',
    "adblocker",
    // 'offers-cc',
    // 'onboarding-v3',
    // "type-filter",
    // "history",
    // "video-downloader",
    // "p2p",
    // "proxyPeer",
    // "pairing",
    // "antitracking-blocker",
    // "cookie-monster",
    // "privacy",
    // "inter-ext-messaging",
    // "privacy-migration",
    // "terms-and-conditions"
  ],
  "bundles": [
    "hpnv2/worker.wasm.bundle.js",
    "hpnv2/worker.asmjs.bundle.js",
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
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie', 'rxjs'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie',
      'rxjs': 'Rx',
      'rxjs/Rx.js': 'Rx',
    }),
  })
}
