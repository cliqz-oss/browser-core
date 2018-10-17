/* eslint-disable */

'use strict';

const urls = require('./common/urls-ghostery');
const publish = require('./common/publish');

module.exports = {
  "platform": "webextension",
  "brocfile": "Brocfile.node.js",
  "baseURL": "/cliqz/",
  "pack": "npm pack",
  "publish": publish.toEdge('browser-core', 'ghostery'),
  "sourceMaps": false,
  "format": "common",
  "settings": Object.assign({}, urls, {
    "channel": "CH80",
    "MSGCHANNEL": "web-extension",
    "KEY_DS_PUBKEY": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwXo4hXvboKHCggNJ0UNFvZQfDWi0jNcF1kBHthxilMu6LB\/hFrSMQ+\/FgTqVE36cCezWE0K1UcwmYGVsuqxcvql82RfCmYUVBroJ3UFG8qnetYfU5FOk43C555p5l5HzlF8QilcCUBCO4SCj9lEZ3\/8FJboCupTqxEUq7nwUgaNZOiGKMdDUBZJO1tW4LSH4lj9IAZccEJ5HKVmJKopQ3hmzWgDqowxni4NQz+0DnsSfCGAupKaJDxjfajJosX5i674rgdHbZGtgHB3M9jhc6HFNPcmtUgLwgtUtRwMhSnya6q\/O06euouNi1h0m5eRrWeMRlJSdUnelLSU8QNy7LQIDAQAB",
    "KEY_SECURE_LOGGER_PUBKEY": "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAh5HhcRAn6+6woXQXl\/NtZ+fOooNglZct\/HSpYuqkcmrPauHW7EuOSq5bvpBZRTDROjR\/kUPomqVZIzqhdCFPA8BwXSCz7hAel2Q157vtBvh9sngMMLXb5Fgzef5N4EuKO8pL5KrS+I9tfZac41vFJSdpgAirZYhh+tdcQQ1z0Qv\/Rw0zOXjfvddCz3gEv2gB9KsLMVnTS1J4YOOgfza2adg9Ebz1z99DiF4vtCwn0IUwH\/3ToTBwJLbMnC3Ol43yBNk8rgK2mkgCi614vOSD3hnVmio+iW6+AUklM8VPl6l7hEK9cljJY+9UsMVmTrvaFbMPwS6AdZCXKTmNdaMJcy3zSOXu5zvzihoQLwAu9LM3l2eVk0Mw0K7JXOP20fc8BtzWCOLYVP32r4R0BNuhTtvGqjHNZHPJN5OwaxkLpn2dujL9uDWGjRiOItKMVq\/nOqmNGghrbf8IOaKT7VQhqOU4cXRkB\/uF1UjYETBavwUZAxx9Wd\/cMcAGmKiDxighxxQ29jDufl+2WG065tmJz+zCxmgrPh6Zb3KFUxPTe6yksAhWJhmGShA9v20t84M5c6NpZXoUsFcVja6XxzHeSB8dWq9Uu5QcZ83Gz\/ronwdEjT2OGTtBgOFeTDqLYUgphC1gcUEHOCnTNXRMQOXqGwBfZHp+Mq61QcMq2rNS7xECAwEAAQ==",
    "HPN_CHANNEL": "ghostery",
    "OFFERS_CHANNEL": "ghostery",
    "ATTRACK_TELEMETRY_PROVIDER": "hpn",
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
    "offersLogsEnabled": true,
    "showConsoleLogs": false,
    "cliqz-adb": true,
    "cliqz-adb-abtest": true,
    "attrackBloomFilter": true,
    "humanWeb": true,
    "cliqz-anti-phishing": true,
    "cliqz-anti-phishing-enabled": true,
    "attrackRemoveQueryStringTracking": false,
    "attrackTelemetryMode": 1,
    "attrackDefaultAction": "placeholder",
    "sendAntiTrackingHeader": false,
    "telemetry": false,
    "attrackCookieTrustReferers": true,
  },
  "bundles": [
    "core/content-script.bundle.js",
    "hpn/worker.bundle.js",
    "hpnv2/worker.bundle.js"
  ],
  "modules": [
    "core",
    "message-center",
    "human-web",
    "hpn",
    "hpnv2",
    "antitracking",
    "webrequest-pipeline",
    "static",
    "offers-v2",
    "adblocker",
    "anolysis",
    "anti-phishing",
    "myoffrz-helper",
    "popup-notification",
  ],
  "system": {
    "map": {
      "BigInt": "node_modules/BigInt/src/BigInt.js"
    },
    "meta": {
      "BigInt": { "format": "cjs" }
    }
  }
}
