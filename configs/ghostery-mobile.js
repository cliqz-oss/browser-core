/* eslint-disable */

'use strict';

const urls = require('./common/urls-ghostery');
const publish = require('./common/publish');

module.exports = {
  "platform": "webextension",
  "brocfile": "Brocfile.node.js",
  "baseURL": "/cliqz/",
  "pack": "npm pack",
  "publish": publish.toEdge('browser-core', 'ghostery-mobile'),
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
    "telemetryExtensionId": "android@cliqz.com",
  }),
  "default_prefs": {
    "modules.antitracking.enabled": true,
    "modules.adblocker.enabled": true,
    "modules.insights.enabled": false,
    "showConsoleLogs": false,
    "cliqz-adb": true,
    "cliqz-adb-abtest": true,
    "attrackBloomFilter": false,
    "humanWeb": false,
    "attrackTelemetryMode": 0,
    "attrackDefaultAction": "placeholder",
    "sendAntiTrackingHeader": false,
    "telemetry": false,
    "attrackCookieTrustReferers": true,
  },
  "bundles": [
    "core/content-script.bundle.js",
  ],
  "modules": [
    "core",
    "antitracking",
    "webrequest-pipeline",
    "static",
    "adblocker",
    "anolysis-remote",
    "insights",
  ],
}
