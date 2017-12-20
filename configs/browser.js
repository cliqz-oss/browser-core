/* eslint-disable */

'use strict';

const base = require('./common/system');
const reactLibs = require('./common/subprojects/react');
module.exports = {
  "platform": "firefox",
  "baseURL": "resource://cliqz/",
  "testsBasePath": "./build/cliqz@cliqz.com/chrome/content",
  "testem_launchers": ["unit-node", "Chrome"],
  "testem_launchers_ci": ["unit-node"],
  "pack": "cd build && fab package:version=$VERSION,cert_path=$CLIQZ_CERT_PATH,cert_pass_path=$CLIQZ_CERT_PASS_PATH",
  "publish": "cd build && fab publish:beta=$CLIQZ_BETA,channel=$CLIQZ_CHANNEL,pre=$CLIQZ_PRE_RELEASE,version=$VERSION,cert_path=$CLIQZ_CERT_PATH,cert_pass_path=$CLIQZ_CERT_PASS_PATH",
  "settings": {
    "id": "cliqz@cliqz.com",
    "name": "Cliqz",
    "channel": "40",
    "homepageURL": "https://cliqz.com/",
    "updateURL": "https://s3.amazonaws.com/cdncliqz/update/browser/latest.rdf",
    "updateURLbeta": "https://s3.amazonaws.com/cdncliqz/update/browser_beta/latest.rdf",
    "freshTabNews": true,
    "unblockUI": false,
    "showDataCollectionMessage": false,
    "antitrackingButton": true,
    "helpMenus": true,
    "showNewBrandAlert": true,
    "suggestions": false,
    "onBoardingVersion": "3.0",
    "ENDPOINT_BLIND_SIGNER": "https://hpn-sign.cliqz.com/sign",
    "ENDPOINT_USER_REG": "https://hpn-sign.cliqz.com/register",
    "ENDPOINT_SOURCE_MAP_PROVIDER": "https://hpn-collector.cliqz.com/sourcemapjson?q=1",
    "ENDPOINT_LOOKUP_TABLE_PROVIDER": "https://hpn-collector.cliqz.com/v2/lookuptable?q=1",
    "ENDPOINT_KEYS_PROVIDER": "https://hpn-collector.cliqz.com/signerKey?q=1",
    "ENDPOINT_PROXY_LIST_PROVIDER": "https://hpn-collector.cliqz.com/v2/proxyList?q=1",
    "ENDPOINT_PATTERNSURL": "https://cdn.cliqz.com/human-web/patterns",
    "ENDPOINT_ANONPATTERNSURL": "https://cdn.cliqz.com/human-web/patterns-anon",
    "ENDPOINT_CONFIGURL": "https://safe-browsing.cliqz.com/config",
    "ENDPOINT_SAFE_QUORUM_ENDPOINT": "https://safe-browsing-quorum.cliqz.com/",
    "ENDPOINT_SAFE_QUORUM_PROVIDER": "https://safe-browsing-quorum.cliqz.com/config",
    "ENDPOINT_HPNV2_CONFIG": "https://collector-hpn.cliqz.com/config",
    "ENDPOINT_HPNV2_JOIN": "https://collector-hpn.cliqz.com/join",
    "ENDPOINT_HPNV2_COLLECTOR": "https://collector-hpn.cliqz.com",
    "KEY_DS_PUBKEY": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwXo4hXvboKHCggNJ0UNFvZQfDWi0jNcF1kBHthxilMu6LB\/hFrSMQ+\/FgTqVE36cCezWE0K1UcwmYGVsuqxcvql82RfCmYUVBroJ3UFG8qnetYfU5FOk43C555p5l5HzlF8QilcCUBCO4SCj9lEZ3\/8FJboCupTqxEUq7nwUgaNZOiGKMdDUBZJO1tW4LSH4lj9IAZccEJ5HKVmJKopQ3hmzWgDqowxni4NQz+0DnsSfCGAupKaJDxjfajJosX5i674rgdHbZGtgHB3M9jhc6HFNPcmtUgLwgtUtRwMhSnya6q\/O06euouNi1h0m5eRrWeMRlJSdUnelLSU8QNy7LQIDAQAB",
    "KEY_SECURE_LOGGER_PUBKEY": "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAh5HhcRAn6+6woXQXl\/NtZ+fOooNglZct\/HSpYuqkcmrPauHW7EuOSq5bvpBZRTDROjR\/kUPomqVZIzqhdCFPA8BwXSCz7hAel2Q157vtBvh9sngMMLXb5Fgzef5N4EuKO8pL5KrS+I9tfZac41vFJSdpgAirZYhh+tdcQQ1z0Qv\/Rw0zOXjfvddCz3gEv2gB9KsLMVnTS1J4YOOgfza2adg9Ebz1z99DiF4vtCwn0IUwH\/3ToTBwJLbMnC3Ol43yBNk8rgK2mkgCi614vOSD3hnVmio+iW6+AUklM8VPl6l7hEK9cljJY+9UsMVmTrvaFbMPwS6AdZCXKTmNdaMJcy3zSOXu5zvzihoQLwAu9LM3l2eVk0Mw0K7JXOP20fc8BtzWCOLYVP32r4R0BNuhTtvGqjHNZHPJN5OwaxkLpn2dujL9uDWGjRiOItKMVq\/nOqmNGghrbf8IOaKT7VQhqOU4cXRkB\/uF1UjYETBavwUZAxx9Wd\/cMcAGmKiDxighxxQ29jDufl+2WG065tmJz+zCxmgrPh6Zb3KFUxPTe6yksAhWJhmGShA9v20t84M5c6NpZXoUsFcVja6XxzHeSB8dWq9Uu5QcZ83Gz\/ronwdEjT2OGTtBgOFeTDqLYUgphC1gcUEHOCnTNXRMQOXqGwBfZHp+Mq61QcMq2rNS7xECAwEAAQ==",
    "HW_CHANNEL": "cliqz",
    "HPN_CHANNEL": "cliqz",
    "NEW_TAB_URL": "resource://cliqz/freshtab/home.html",
    "HISTORY_URL": "resource://cliqz/cliqz-history/index.html#/",
    "modules.history.search-path": "?query=",
    "ICONS": {
      "active": {
        "default": "control-center/images/cc-active.svg",
        "dark": "control-center/images/cc-active-dark.svg"
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
    "ATTRACK_TELEMETRY_PROVIDER": "hpn",
    "CONFIG_PROVIDER": "https://api.cliqz.com/api/v1/config",
    "CDN_BASEURL": "https://cdn.cliqz.com",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"]
  },
  "default_prefs" : {
    "searchMode": "autocomplete",
    "modules.context-search.enabled": false,
    "modules.history.enabled": false,
    "modules.type-filter.enabled": false,
    "modules.antitracking-blocker.enabled": false,
    "modules.history-analyzer.enabled": false,
    "proxyPeer": false,
    "proxyTrackers": false,
    "modules.cookie-monster.enabled": false
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
    "antitracking",
    "webrequest-pipeline",
    "performance",
    "hpn",
    "control-center",
    "offers-v2",
    "history-analyzer",
    "offers-debug",
    "browser-panel",
    "message-center",
    "offboarding",
    "anolysis",
    "abtests",
    "unblock",
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
    "pairing",
    "antitracking-blocker",
    "green-ads",
    "search",
    "cookie-monster"
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
    {
      "src": "node_modules/@cliqz-oss/pouchdb/dist",
      "include": ["pouchdb.js"],
      "dest": "vendor"
    },
    reactLibs.react,
    reactLibs.reactDom
  ],
  systemDefault: base.systemConfig,
  builderDefault: base.builderConfig,
  bundleConfigs: Object.assign({}, base.appBundleConfig),
};
