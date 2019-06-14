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
  }),
  "default_prefs" : {
  },
  "modules": [
    "core",
    "core-cliqz",
    "anolysis",
    "telemetry",
    "insights",
    "video-downloader",
  ],
  "bundles": [
  ]
};
