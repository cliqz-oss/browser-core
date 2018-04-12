/* eslint-disable */

'use strict';

const base = require('./common/system');
const urls = require('./common/urls');
const subprojects = require('./common/subprojects/bundles');

module.exports = {
  "platform": "firefox",
  "baseURL": "resource://cliqz/",
  "testsBasePath": "./build/testpilot@cliqz.com/chrome/content",
  "testem_launchers": ["unit-node", "Chrome"],
  "testem_launchers_ci": ["unit-node"],
  'settings': Object.assign({
    "id": "testpilot@cliqz.com",
    "name": "Cliqz Test Pilot",
    "channel": "TP02",
    "updateURL": "https://testpilot.firefox.com/files/testpilot@cliqz.com/updates.json",
    "homepageURL": "https://testpilot.firefox.com/experiments/cliqz",
    "freshTabNews": false,
    "showDataCollectionMessage": true,
    "antitrackingButton": true,
    "showNewBrandAlert": false,
    "suggestions": false,
    "onBoardingVersion": "1.1",
    "KEY_DS_PUBKEY": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwXo4hXvboKHCggNJ0UNFvZQfDWi0jNcF1kBHthxilMu6LB\/hFrSMQ+\/FgTqVE36cCezWE0K1UcwmYGVsuqxcvql82RfCmYUVBroJ3UFG8qnetYfU5FOk43C555p5l5HzlF8QilcCUBCO4SCj9lEZ3\/8FJboCupTqxEUq7nwUgaNZOiGKMdDUBZJO1tW4LSH4lj9IAZccEJ5HKVmJKopQ3hmzWgDqowxni4NQz+0DnsSfCGAupKaJDxjfajJosX5i674rgdHbZGtgHB3M9jhc6HFNPcmtUgLwgtUtRwMhSnya6q\/O06euouNi1h0m5eRrWeMRlJSdUnelLSU8QNy7LQIDAQAB",
    "KEY_SECURE_LOGGER_PUBKEY": "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAh5HhcRAn6+6woXQXl\/NtZ+fOooNglZct\/HSpYuqkcmrPauHW7EuOSq5bvpBZRTDROjR\/kUPomqVZIzqhdCFPA8BwXSCz7hAel2Q157vtBvh9sngMMLXb5Fgzef5N4EuKO8pL5KrS+I9tfZac41vFJSdpgAirZYhh+tdcQQ1z0Qv\/Rw0zOXjfvddCz3gEv2gB9KsLMVnTS1J4YOOgfza2adg9Ebz1z99DiF4vtCwn0IUwH\/3ToTBwJLbMnC3Ol43yBNk8rgK2mkgCi614vOSD3hnVmio+iW6+AUklM8VPl6l7hEK9cljJY+9UsMVmTrvaFbMPwS6AdZCXKTmNdaMJcy3zSOXu5zvzihoQLwAu9LM3l2eVk0Mw0K7JXOP20fc8BtzWCOLYVP32r4R0BNuhTtvGqjHNZHPJN5OwaxkLpn2dujL9uDWGjRiOItKMVq\/nOqmNGghrbf8IOaKT7VQhqOU4cXRkB\/uF1UjYETBavwUZAxx9Wd\/cMcAGmKiDxighxxQ29jDufl+2WG065tmJz+zCxmgrPh6Zb3KFUxPTe6yksAhWJhmGShA9v20t84M5c6NpZXoUsFcVja6XxzHeSB8dWq9Uu5QcZ83Gz\/ronwdEjT2OGTtBgOFeTDqLYUgphC1gcUEHOCnTNXRMQOXqGwBfZHp+Mq61QcMq2rNS7xECAwEAAQ==",
    "HW_CHANNEL": "ff-test-pilot",
    "HPN_CHANNEL": "cliqz",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
  }, urls),
  'default_prefs' : {
  },
  "modules": [
    "firefox-specific",
    "static",
    "core",
    "core-cliqz",
    "dropdown",
    "ui",
    "webrequest-pipeline",
    "human-web",
    "context-menu",
    "performance",
    "hpn",
    "geolocation",
    "message-center",
    "freshtab",
    "offboarding",
    "search"
  ],
  "subprojects": subprojects([
    '@cliqz-oss/dexie',
    '@cliqz-oss/pouchdb',
    'handlebars',
    'jquery',
    'mathjs',
    'moment',
    'moment-range',
    'react',
    'reactDom',
    'simple-statistics',
    'tldjs',
    'ua-parser-js',
  ]),
  systemDefault: base.systemConfig,
  builderDefault: base.builderConfig,
  bundleConfigs: Object.assign({}, base.appBundleConfig),
}
