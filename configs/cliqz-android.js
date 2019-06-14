const publish = require('./common/publish');
const urls = require('./common/urls-cliqz');

module.exports = {
  "platform": "react-native",
  "format": "common",
  "baseURL": "/",
  "testsBasePath": "./build/modules",
  "testem_launchers": ["unit-node"],
  "testem_launchers_ci": ["unit-node"],
  "pack": "npm pack",
  "publish": publish.toEdge('browser-core', 'cliqz-android'),
  "isMobile": true,
  "settings": Object.assign({}, urls, {
    "RESULTS_TIMEOUT": 3000,
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "RESULTS_PROVIDER_ORDER": ["calculator", "history", "cliqz", "querySuggestions", "instant"],
    "CLEAR_RESULTS_AT_SESSION_START": false,
    "antitrackingButton": false,
    "ATTRACK_TELEMETRY_PROVIDER": "platform",
    "channel": "MR00",
    "antitrackingPlaceholder": "cliqz.com/tracking",
    "antitrackingHeader": "CLIQZ-AntiTracking",
  }),
  "default_prefs" : {
    "attrackBloomFilter": true,
    "attrackForceBlock": true,
    "cliqz-adb": 0,
    "cliqz-adb-disk-cache": false,
    "cliqz-adb-abtest": true,
    "modules.pairing.enabled": false,
    "attrackTelemetryMode": 0,
  },
  "modules": [
    "core",
    "core-cliqz",
    "search",
    "webrequest-pipeline",
    "antitracking",
    "antitracking-blocker",
    "adblocker",
    "p2p",
    "pairing",
    "mobile-pairing",
    "mobile-cards",
    "video-downloader",
    "anolysis",
    "geolocation"
  ],
  "bundles": [
  ],
  "react_components": {
    "ExtensionApp": "./modules/mobile-cards/cliqz-ios/ExtensionApp"
  },
  "resources": {
    "bundling": "assets",
    "include": [
      "core/logo-database.json",
      "antitracking/prob.json",
      "antitracking/config.json",
      "antitracking/tracker_db_v2.json",
      "antitracking-blocker/bugs_default.json"
    ]
  }
};