/* eslint-disable */

'use strict';

const base = require('./common/system');
const browserBase = require('./common/browser');
const reactLibs = require('./common/subprojects/react');

module.exports = Object.assign({}, browserBase, {
  "default_prefs" : {
    "searchMode": "autocomplete",
    "modules.context-search.enabled": false,
    "modules.type-filter.enabled": false,
    "modules.anolysis.enabled": false,
    "modules.antitracking-blocker.enabled": false,
    "modules.green-ads.enabled": false,
    "humanWeb": true
  },
  "modules": [
    "core",
    "core-cliqz",
    "dropdown",
    "firefox-specific",
    "static",
    "autocomplete",
    "geolocation",
    "ui",
    "human-web",
    "anti-phishing",
    "context-menu",
    "freshtab",
    "webrequest-pipeline",
    "antitracking",
    "performance",
    "hpn",
    "control-center",
    "offers-v2",
    "history-analyzer",
    "browser-panel",
    "message-center",
    "offboarding",
    "anolysis",
    "abtests",
    "unblock",
    "theme",
    "context-search",
    "hm",
    "privacy-dashboard",
    "adblocker",
    "https-everywhere",
    "onboarding-v3",
    "moncomp",
    "type-filter",
    "history",
    "offers-cc",
    "video-downloader",
    "market-analysis",
    "p2p",
    "proxyPeer",
    "pairing",
    "antitracking-blocker",
    "green-ads",
    "campaign-manager",
    "firefox-tests",
    "antispy",
    "perf",
    "search",
    "offers-debug",
    "hpnv2",
    "secvm"
  ],
  "subprojects": [
    {
      "src": "node_modules/cliqz-history/dist",
      "dest": "cliqz-history"
    },
    {
      "src": "node_modules/dexie/dist",
      "include": ["dexie.min.js"],
      "dest": "vendor"
    },
    {
      "src":"bower_components/jquery/dist",
      "include": ["jquery.min.js"],
      "dest": "vendor"
    },
    {
      "src": "bower_components/handlebars",
      "include": ["handlebars.min.js"],
      "dest": "vendor"
    },
    {
      "src": "bower_components/mathjs/dist",
      "include": ["math.min.js"],
      "dest": "vendor"
    },
    reactLibs.react,
    reactLibs.reactDom
  ],
  systemDefault: base.systemConfig,
  builderDefault: base.builderConfig,
  bundleConfigs: Object.assign({}, base.appBundleConfig),
});
