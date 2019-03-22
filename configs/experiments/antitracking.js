/* eslint-disable */

'use strict';

const urls = require('../common/urls-cliqz');
const publish = require('../common/publish');

module.exports = {
  "platform": "webextension",
  "brocfile": "Brocfile.ghostery.js",
  "baseURL": "/cliqz/",
  "pack": "npm pack",
  "publish": publish.toEdge('browser-core', 'antitracking'),
  "sourceMaps": false,
  "format": "common",
  "settings": Object.assign({}, urls, {
    "channel": "AT01",
    "MSGCHANNEL": "web-extension",
    "ATTRACK_TELEMETRY_PROVIDER": "hpnv2",
    // "channel" on HPN messages from anti-tracking - to distinguish data sources
    "HW_CHANNEL": "antitracking",
    // Countries for which we may send the user country in messages (to measure region effects) -
    // Requires a threshold of users from that region for this channel
    "ALLOWED_COUNTRY_CODES": [],
    // String to use in place of user-identifiers in request query parameters.
    "antitrackingPlaceholder": "anonymized",
    // Header to send when request has been anonymised
    "antitrackingHeader": "Antitracking",
  }),
  "default_prefs": {
    // start with antitracking module enabled
    "modules.antitracking.enabled": true,
    // Enable hpnv2 module for anonymised data collection
    "modules.hpnv2.enabled": true,
    // Show logs from Cliqz modules
    "showConsoleLogs": false,
    // Enable third-party cookie blocking
    "attrackBlockCookieTracking": true,
    // Enable removal of unique query parameters
    "attrackRemoveQueryStringTracking": true,
    // Only send data for trackers. 0 = off, 2 = for all third parties
    "attrackTelemetryMode": 1,
    // Action on user id in url parameters. Options are:
    // - placeholder: replace with "antitrackingPlaceHolder" value (above)
    // - block: block request
    // - empty: empty string placeholder
    // - replace: Randomise value
    "attrackDefaultAction": "placeholder",
    // Overrides above, and blocks requests instead
    "attrackForceBlock": false,
    // Send an extra header when anti-tracking modifies a request
    "attrackSendHeader": false,
    // Enable referrer trust mechanism - Prevents issues with some site logins when blocking third
    // party cookies.
    "attrackCookieTrustReferers": true,
    // Change the user-agent for modified requests to "CLIQZ"
    "attrackOverrideUserAgent": false,
  },
  "bundles": [
    "core/content-script.bundle.js",
    "hpnv2/worker.wasm.bundle.js",
    "hpnv2/worker.asmjs.bundle.js",
  ],
  "modules": [
    "core",
    "hpnv2",
    "antitracking",
    "webrequest-pipeline",
  ]
}
