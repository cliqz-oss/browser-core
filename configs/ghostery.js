/* eslint-disable */

'use strict';

const urls = require('./common/urls-ghostery');
const publish = require('./common/publish');

module.exports = {
  "platform": "webextension",
  "brocfile": "Brocfile.ghostery.js",
  "baseURL": "/cliqz/",
  "pack": "npm pack",
  "publish": publish.toEdge('browser-core', 'ghostery'),
  "sourceMaps": false,
  "format": "common",
  "settings": Object.assign({}, urls, {
    "channel": "CH80",
    "MSGCHANNEL": "web-extension",
    "OFFERS_CHANNEL": "ghostery",
    "ATTRACK_TELEMETRY_PROVIDER": "hpnv2",
    "HW_CHANNEL": "ghostery",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "be", "se", "dk", "fi", "cz", "gr", "hu", "ro", "no", "ca", "au", "ru", "ua", "in", "pl", "jp", "br", "mx", "cn", "ar"],
    "antitrackingPlaceholder": "ghostery",
    "antitrackingHeader": "Ghostery-AntiTracking",
  }),
  "default_prefs": {
    "modules.human-web.enabled": true,
    "modules.offers-v2.enabled": true,
    "modules.message-center.enabled": false,
    "modules.antitracking.enabled": true,
    "modules.anti-phishing.enabled": false,
    "modules.adblocker.enabled": true,
    "modules.insights.enabled": false,
    "offersLogsEnabled": true,
    "showConsoleLogs": false,
    "cliqz-adb": 1,
    "cliqz-adb-abtest": true,
    "attrackBloomFilter": true,
    "humanWeb": true,
    "cliqz-anti-phishing": true,
    "cliqz-anti-phishing-enabled": true,
    "attrackTelemetryMode": 1,
    "attrackDefaultAction": "placeholder",
    "sendAntiTrackingHeader": false,
    "telemetry": false,
    "attrackCookieTrustReferers": true,
    "attrack.cookieMode": 'ghostery',
  },
  "bundles": [
    "core/content-script.bundle.js",
    "hpnv2/worker.wasm.bundle.js",
    "hpnv2/worker.asmjs.bundle.js",
    "human-web/rusha.bundle.js",
  ],
  "modules": [
    "core",
    "message-center",
    "human-web",
    "hpnv2",
    "antitracking",
    "webrequest-pipeline",
    "offers-v2",
    "adblocker",
    "anolysis",
    "anti-phishing",
    "myoffrz-helper",
    "popup-notification",
    "insights",
  ]
}
