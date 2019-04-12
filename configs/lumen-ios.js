const publish = require('./common/publish');
const urls = require('./common/urls-lumen');

module.exports = {
  "platform": "react-native",
  "format": "common",
  "baseURL": "/",
  "testsBasePath": "./build/modules",
  "testem_launchers": ["unit-node"],
  "testem_launchers_ci": ["unit-node"],
  "versionPrefix": "13",
  "versionInfix": ".",
  // pack changes the name in package.json before running npm pack
  "pack": [
    "(jq '.name=\\\"browser-core-lumen-ios\\\"' package.json > package-new.json)",
    "mv package.json package-old.json",
    "mv package-new.json package.json",
    "npm pack",
    "mv package-old.json package.json",
  ].join(" && "),
  "publish": publish.toEdge('browser-core-lumen-ios', 'lumen-ios'),
  "isMobile": true,
  "settings": Object.assign({}, urls, {
    "RESULTS_TIMEOUT": 3000,
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "RESULTS_PROVIDER_ORDER": ["calculator", "history", "cliqz", "querySuggestions", "instant"],
    "CLEAR_RESULTS_AT_SESSION_START": false,
  }),
  "default_prefs" : {
    "modules.insights.enabled": false,
  },
  "modules": [
    "core",
    "core-cliqz",
    "static",
    "anolysis",
    "telemetry",
    "insights",
    "video-downloader",
  ],
  "bundles": [
  ]
};
