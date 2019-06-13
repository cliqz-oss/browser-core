/* eslint-disable */

'use strict';

const urls = require('./common/urls-ghostery');
const publish = require('./common/publish');
const base = require('./common/system');

module.exports = {
  "platform": "webextension",
  "brocfile": "Brocfile.privacy.js",
  "specific": "privacy",
  "baseURL": "/modules/",
  "pack": "web-ext build -s build -a .",
  "publish": publish.toPrerelease('cliqz_privacy', 'cliqz_privacy', 'zip'),
  "sourceMaps": false,
  "versionInfix": ".",
  "versionPrefix": "12",
  "settings": Object.assign({}, urls, {
    "channel": "MA50",
    "MSGCHANNEL": "web-extension",
    "OFFERS_CHANNEL": "ghostery",
    "ATTRACK_TELEMETRY_PROVIDER": "hpnv2",
    "HW_CHANNEL": "ghostery",
    "antitrackingPlaceholder": "ghostery",
    "antitrackingHeader": "Ghostery-AntiTracking",
  }),
  "default_prefs": {
    "modules.insights.enabled": false,
    "modules.webextension-specific.enabled": false,
    "cliqz-adb": 1,
    "cliqz-adb-abtest": true,
    "cliqz-adb-strict": true,
    "attrackBloomFilter": false,
    "attrackTelemetryMode": 0,
    "attrackDefaultAction": "placeholder",
    "sendAntiTrackingHeader": false,
    "attrackCookieTrustReferers": true,
  },
  "bundles": [
    "cliqz-android/app.bundle.js",
    "core/content-script.bundle.js",
    "cliqz-android/cliqz-app-constants.bundle.js",
  ],
  "modules": [
    "core",
    "antitracking",
    "webrequest-pipeline",
    "static",
    "adblocker",
    "anolysis",
    "core-cliqz",
    "abtests-legacy",
    "cliqz-android",
    "webextension-specific",
    "telemetry",
    "control-center"
  ],
  system: base.systemConfig,
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie'
    }),
  }),
}
