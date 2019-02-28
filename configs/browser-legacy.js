/* eslint-disable */

'use strict';

const base = require('./common/system');
const urls = require('./common/urls-cliqz');

module.exports = {
  "platform": "firefox",
  "baseURL": "resource://cliqz/",
  "testsBasePath": "./build/cliqz@cliqz.com/chrome/content",
  "testem_launchers": ["unit-node", "Chrome"],
  "testem_launchers_ci": ["unit-node"],
  "pack": "cd build && fab package:version=$VERSION,cert_path=$CLIQZ_CERT_PATH,cert_pass_path=$CLIQZ_CERT_PASS_PATH",
  "publish": "cd build && fab publish:beta=$CLIQZ_BETA,channel=$CLIQZ_CHANNEL,pre=$CLIQZ_PRE_RELEASE,version=$VERSION,cert_path=$CLIQZ_CERT_PATH,cert_pass_path=$CLIQZ_CERT_PASS_PATH",
  "updateURL": "https://s3.amazonaws.com/cdncliqz/update/browser/latest.rdf",
  "updateURLbeta": "https://s3.amazonaws.com/cdncliqz/update/browser_beta/latest.rdf",
  "settings": Object.assign({}, urls, {
    "id": "cliqz@cliqz.com",
    "name": "Cliqz",
    "channel": "40",
    "homepageURL": "https://cliqz.com/",
    "freshTabNews": true,
    "freshTabStats": true,
    "showDataCollectionMessage": false,
    "helpMenus": true,
    "suggestions": false,
    "onBoardingVersion": "3.1",
    "onBoardingPref": "browserOnboarding",
    "ENDPOINT_ANONPATTERNSURL": "https://cdn.cliqz.com/browser-f/patterns-anon",
    "ENDPOINT_PATTERNSURL": "https://cdn.cliqz.com/browser-f/patterns",
    "HW_CHANNEL": "cliqz",
    "NEW_TAB_URL": "resource://cliqz/freshtab/home.html",
    "ONBOARDING_URL": "resource://cliqz/onboarding-v3/index.html",
    "HISTORY_URL": "resource://cliqz/cliqz-history/index.html#/",
    "CLIQZ_FOR_FRIENDS": "cliqz-for-friends/feed.html",
    "modules.history.search-path": "?query=",
    "ICONS": {
      "active": "control-center/images/cc-active.svg",
      "inactive": "control-center/images/cc-critical.svg",
      "critical": "control-center/images/cc-critical.svg"
    },
    "ATTRACK_TELEMETRY_PROVIDER": "hpnv2",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "antitrackingPlaceholder": "cliqz.com/tracking",
    "antitrackingHeader": "CLIQZ-AntiTracking",
    "FRESHTAB_TITLE": "Cliqz Tab",
  }),
  "default_prefs": {
    "modules.context-search.enabled": false,
    "modules.history.enabled": true,
    "modules.type-filter.enabled": false,
    "modules.antitracking-blocker.enabled": false,
    "modules.history-analyzer.enabled": false,
    "proxyPeer": false,
    "proxyTrackers": false,
    "modules.cookie-monster.enabled": true,
    "friends.enable.level": "development",
  },
  "modules": [
    "core",
    "telemetry",
    "core-cliqz",
    "dropdown",
    "abtests-legacy",
    "firefox-specific",
    "static",
    "geolocation",
    "ui",
    "last-query",
    "human-web",
    "anti-phishing",
    "context-menu",
    "freshtab",
    "antitracking",
    "webrequest-pipeline",
    "performance",
    "hpnv2",
    "control-center",
    "offers-v2",
    "popup-notification",
    "history-analyzer",
    "offers-debug",
    "browser-panel",
    "message-center",
    "offboarding",
    "anolysis",
    "anolysis-cc",
    "theme",
    "context-search",
    "privacy-dashboard",
    "adblocker",
    "https-everywhere",
    "onboarding-v3",
    "type-filter",
    "history",
    "offers-cc",
    "video-downloader",
    "market-analysis",
    "p2p",
    "proxyPeer",
    "pairing",
    "antitracking-blocker",
    "search",
    "cookie-monster",
    "privacy",
    "inter-ext-messaging",
    "privacy-migration",
    "myoffrz-helper",
    "insights",
    "toolbox",
    "cliqz-for-friends",
    "antifraud",
  ],
  "bundles": [
    "adblocker/diagnosis.bundle.js",
    "anolysis-cc/dashboard/anolysis.bundle.js",
    "anti-phishing/phishing-warning.bundle.js",
    "browser-panel/browser-panel.bundle.js",
    "browser-panel/debug.bundle.js",
    "cliqz-for-friends/referral.bundle.js",
    "control-center/control-center.bundle.js",
    "core/app.bundle.js",
    "core/content-script.bundle.js",
    "dropdown/debug.bundle.js",
    "dropdown/dropdown.bundle.js",
    "freshtab/home.bundle.js",
    "freshtab/offers.bundle.js",
    "hpnv2/worker.asmjs.bundle.js",
    "hpnv2/worker.wasm.bundle.js",
    "human-web/page.bundle.js",
    "offers-cc/offers-cc.bundle.js",
    "offers-debug/offers-debug.bundle.js",
    "pairing/pairing.bundle.js",
    "platform-firefox/process-script.bundle.js",
    "platform/process-script.bundle.js",
    "privacy-dashboard/dashboard.bundle.js",
    "privacy/privacy-dashboard.bundle.js",
    "search/debug.bundle.js",
    "search/inspect.bundle.js",
    "serp/serp.bundle.js",
    "toolbox/toolbox.bundle.js",
    "video-downloader/video-downloader.bundle.js",
    "human-web/rusha.bundle.js",
  ],
  systemDefault: base.systemConfig,
  builderDefault: base.builderConfig,
  bundleConfigs: Object.assign({}, base.appBundleConfig),
};
