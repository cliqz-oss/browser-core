/* eslint-disable */

"use strict";

const base = require("./common/system");
const urls = require("./common/urls-cliqz");
const settings = require("./common/amo-settings");

module.exports = {
  "platform": "webextension",
  "specific": "amo",
  "baseURL": "/modules/",
  "pack": "web-ext build -s build -a .",
  "publish": "",
  "settings": Object.assign({}, urls, settings, {
    "antitrackingProtectionEnabled": false,
    "offboardingURLs": {
      "en": "https://cliqz.com/home/offboarding",
    },
  }),
  "default_prefs" : {
    "freshtab.search.mode": "search",
    "modules.history-analyzer.enabled": false,
    "modules.anolysis.enabled": false,
    "showConsoleLogs": false,
    "modules.browser-panel.enabled": false,
    "modules.offers-cc.enabled": false,
  },
  "modules": [
    "core",
    "telemetry",
    "core-cliqz",
    "dropdown",
    'abtests-legacy',
    "geolocation",
    "human-web",
    "freshtab",
    "webrequest-pipeline",
    'antitracking',
    "hpnv2",
    "myoffrz-helper",
    "offers-banner",
    "offers-cc",
    "offers-v2",
    "popup-notification",
    "history-analyzer",
    "browser-panel",
    "control-center",
    "message-center",
    "anolysis",
    "anolysis-cc",
    "market-analysis",
    "search",
    "webextension-specific",
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
    "offers-cc/offers-cc.bundle.js",
    "offers-banner/app.bundle.js",
    "human-web/page.bundle.js",
    "human-web/rusha.bundle.js",
  ],
  system: Object.assign({}, base.systemConfig, {
    map: Object.assign({}, base.systemConfig.map, {
      "ajv": "node_modules/ajv/dist/ajv.min.js",
      "jsep": "modules/vendor/jsep.min.js",
    })
  }),
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat("@cliqz-oss/dexie"),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      "@cliqz-oss/dexie": "Dexie"
    }),
  })
}
