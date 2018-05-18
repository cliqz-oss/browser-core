/* eslint-disable */

'use strict';

const urls = require('./common/urls');

module.exports = {
  "platform": "webextension",
  "brocfile": "Brocfile.node.js",
  "baseURL": "/cliqz/",
  "pack": "npm pack",
  "publish": "aws s3 cp browser-core-$PACKAGE_VERSION.tgz s3://cdncliqz/update/edge/ghostery/$BRANCH_NAME/$VERSION.tgz --acl public-read && aws s3 cp s3://cdncliqz/update/edge/ghostery/$BRANCH_NAME/$VERSION.tgz s3://cdncliqz/update/edge/ghostery/$BRANCH_NAME/latest.tgz --acl public-read",
  "sourceMaps": false,
  "format": "common",
  "settings": Object.assign({}, urls, {
    "channel": "CH80",
    "triggers-root": "ghostery-root",
    "CONFIG_PROVIDER": "https://safe-browsing.ghostery.com/config",
    "ENDPOINT_BLIND_SIGNER": "https://ghostery-sign.ghostery.com/sign",
    "ENDPOINT_USER_REG": "https://ghostery-sign.ghostery.com/register",
    "ENDPOINT_SOURCE_MAP_PROVIDER": "https://ghostery-collector.ghostery.com/sourcemapjson",
    "ENDPOINT_LOOKUP_TABLE_PROVIDER": "https://ghostery-collector.ghostery.com/v2/lookuptable",
    "ENDPOINT_KEYS_PROVIDER": "https://ghostery-collector.ghostery.com/signerKey",
    "ENDPOINT_PROXY_LIST_PROVIDER": "https://ghostery-collector.ghostery.com/v2/proxyList",
    "ENDPOINT_PATTERNSURL": "https://cdn2.ghostery.com/human-web-chromium/patterns.gz",
    "ENDPOINT_ANONPATTERNSURL": "https://cdn2.ghostery.com/human-web-chromium/patterns-anon.gz",
    "ENDPOINT_CONFIGURL": "https://safe-browsing.ghostery.com/ts-config",
    "ENDPOINT_SAFE_QUORUM_ENDPOINT": "https://safe-browsing-quorum.ghostery.com/",
    "ENDPOINT_SAFE_QUORUM_PROVIDER": "https://safe-browsing-quorum.ghostery.com/config",
    "MSGCHANNEL": "web-extension",
    "KEY_DS_PUBKEY": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwXo4hXvboKHCggNJ0UNFvZQfDWi0jNcF1kBHthxilMu6LB\/hFrSMQ+\/FgTqVE36cCezWE0K1UcwmYGVsuqxcvql82RfCmYUVBroJ3UFG8qnetYfU5FOk43C555p5l5HzlF8QilcCUBCO4SCj9lEZ3\/8FJboCupTqxEUq7nwUgaNZOiGKMdDUBZJO1tW4LSH4lj9IAZccEJ5HKVmJKopQ3hmzWgDqowxni4NQz+0DnsSfCGAupKaJDxjfajJosX5i674rgdHbZGtgHB3M9jhc6HFNPcmtUgLwgtUtRwMhSnya6q\/O06euouNi1h0m5eRrWeMRlJSdUnelLSU8QNy7LQIDAQAB",
    "KEY_SECURE_LOGGER_PUBKEY": "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAh5HhcRAn6+6woXQXl\/NtZ+fOooNglZct\/HSpYuqkcmrPauHW7EuOSq5bvpBZRTDROjR\/kUPomqVZIzqhdCFPA8BwXSCz7hAel2Q157vtBvh9sngMMLXb5Fgzef5N4EuKO8pL5KrS+I9tfZac41vFJSdpgAirZYhh+tdcQQ1z0Qv\/Rw0zOXjfvddCz3gEv2gB9KsLMVnTS1J4YOOgfza2adg9Ebz1z99DiF4vtCwn0IUwH\/3ToTBwJLbMnC3Ol43yBNk8rgK2mkgCi614vOSD3hnVmio+iW6+AUklM8VPl6l7hEK9cljJY+9UsMVmTrvaFbMPwS6AdZCXKTmNdaMJcy3zSOXu5zvzihoQLwAu9LM3l2eVk0Mw0K7JXOP20fc8BtzWCOLYVP32r4R0BNuhTtvGqjHNZHPJN5OwaxkLpn2dujL9uDWGjRiOItKMVq\/nOqmNGghrbf8IOaKT7VQhqOU4cXRkB\/uF1UjYETBavwUZAxx9Wd\/cMcAGmKiDxighxxQ29jDufl+2WG065tmJz+zCxmgrPh6Zb3KFUxPTe6yksAhWJhmGShA9v20t84M5c6NpZXoUsFcVja6XxzHeSB8dWq9Uu5QcZ83Gz\/ronwdEjT2OGTtBgOFeTDqLYUgphC1gcUEHOCnTNXRMQOXqGwBfZHp+Mq61QcMq2rNS7xECAwEAAQ==",
    "HPN_CHANNEL": "ghostery",
    "ATTRACK_TELEMETRY_PROVIDER": "hpn",
    "HW_CHANNEL": "ghostery",
    "CDN_BASEURL": "https://cdn2.ghostery.com",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se", "be", "se", "dk", "fi", "cz", "gr", "hu", "ro", "no", "ca", "au", "ru", "ua", "in"],
    "OFFERS_BE_BASE_URL": "https://offers.ghostery.com",
    "RICH_HEADER_PROXY_URL" : "hb-news.cliqz.com",
    "TRACKER_PROXY_PROXY_SIGNALING_DEFAULT": "wss://p2p-signaling-proxypeer.cliqz.com",
    "TRACKER_PROXY_PROXY_PEERS_DEFAULT": "https://p2p-signaling-proxypeer.cliqz.com/peers",
    "TRACKER_PROXY_PROXY_PEERS_EXIT_DEFAULT": "https://p2p-signaling-proxypeer.cliqz.com/exitNodes",
    "BW_URL": "https://antiphishing.cliqz.com/api/bwlist?md5=",
    "PRIVACY_SCORE_URL": "https://anti-tracking.cliqz.com/api/v1/score?",
    "SUPPORT_URL": "https://cliqz.com/support/",
    "TEAM_URL": "https://cliqz.com/team/",
    "HOMPAGE_URL": "https://cliqz.com/",
    "JOBS_URL": "https://cliqz.com/jobs/",
    "ENDPOINT_URL": "https://api.cliqz.com/api/v1/rich-header?path=/map&bmresult=",
    "CAMPAIGN_SERVER": "https://fec.cliqz.com/message/",
    "TRIQZ_URL": "https://cliqz.com/tips",
    "SAFE_BROWSING": "https://safe-browsing.cliqz.com",
    "TUTORIAL_URL": "https://cliqz.com/home/onboarding",
    "UNINSTALL": "https://cliqz.com/home/offboarding",
    "FEEDBACK": "https://cliqz.com/feedback/",
    "BACKGROUND_IMAGE_URL": "https://cdn.cliqz.com/brands-database/database/",
    "CLIQZ_SAVE_URL": "https://cliqz.com/q=",
    "SUGGESTIONS_URL": "https://cliqz.com/search?q=",
    "ROTATED_TOP_NEWS": "rotated-top-news.cliqz.com",
    "HB_NEWS": "hb-news.cliqz.com",
    "TELEMETRY_ENDPOINT": "https://safebrowsing-experiment.cliqz.com",
    "INVENTORY_URL": "https://cdn.cliqz.com/browser-f/fun-demo/inventoryv2.txt.gz",
    "OFFER_TELEMETRY": "https://offers-api.cliqz.com/api/v1/savesignal",
    "OFFER_TELEMETRY_PREFIX": "https://offers-api.cliqz.com",
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
    "offers2FeatureEnabled": true,
    "offersLogsEnabled": true,
    "showConsoleLogs": false,
    "cliqz-adb": true,
    "cliqz-adb-abtest": true,
    "attrackBloomFilter": true,
    "humanWeb": true,
    "cliqz-anti-phishing": true,
    "cliqz-anti-phishing-enabled": true,
    "attrackRemoveQueryStringTracking": false,
    "attrackTelemetryMode": 0,
    "attrackDefaultAction": "placeholder",
    "sendAntiTrackingHeader": false
  },
  "bundles": [
    "core/content-script.bundle.js",
    "hpn/worker.bundle.js"
  ],
  "modules": [
    "core",
    "message-center",
    "human-web",
    "hpn",
    "antitracking",
    "webrequest-pipeline",
    "static",
    "offers-v2",
    "adblocker",
    "anti-phishing"
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
