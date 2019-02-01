/* eslint-disable */

'use strict';

const base = require('./common/system');
const urls = require('./common/urls-cliqz');
const settings = require('./common/amo-settings');
const publish = require('./common/publish');

const id = 'cliqz@cliqz.com';
const packageName = 'cliqz_nightly_';
const channel = 'browser_beta';
const artifactUrlPrefix = publish.edgeLatestUrl(channel);
const updateS3Url = `${publish.edgeLatestS3Url(channel)}updates.json`;
const updateUrl = `${artifactUrlPrefix}updates.json`;
const artifactUrl = `${artifactUrlPrefix}latest.xpi`;

module.exports = {
  "platform": "webextension",
  "specific": "browser",
  "baseURL": "/modules/",
  "pack": "web-ext build -s build -a .",
  'sign': "python ./xpi-sign/xpisign.py -k $CLIQZ_CERT_PATH --signer openssl --passin file:$CLIQZ_CERT_PASS_PATH "+packageName+"-$VERSION.zip "+packageName+"-$PACKAGE_VERSION.xpi",
  'publish': `${publish.toEdge(packageName, channel, 'xpi')} && \
     aws s3 cp build/updates.json ${updateS3Url} --acl public-read && \
     python ./fern/submitter.py -a "http://balrog-admin.10e99.net/api" -r "${channel}" --addon-id "${id}" --addon-version $VERSION --addon-url "${artifactUrl}"`,
  'testsBasePath': "./build/modules",
  'updateURL': updateUrl,
  'updateURLbeta': updateUrl,
  'versionInfix': '.',
  'artifactUrl': artifactUrl,
  'settings': Object.assign({}, urls, settings, {
    "id": id,
    "name": "browserAppNameNightly",
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
    "NEW_TAB_URL": "/freshtab/home.html",
    "ONBOARDING_URL": "resource://cliqz/onboarding-v3/index.html",
    "HISTORY_URL": "/cliqz-history/index.html",
    "CLIQZ_FOR_FRIENDS": "cliqz-for-friends/dashboard.html",
    "modules.history.search-path": "?query=",
    "ICONS": {
      "active": "control-center/images/cc-active.svg",
      "inactive": "control-center/images/cc-critical.svg",
      "critical": "control-center/images/cc-critical.svg"
    },
    "BACKGROUNDS": {
      "active": "#471647",
      "inactive": "#471647",
      "critical": "#471647"
    },
    "ATTRACK_TELEMETRY_PROVIDER": "hpnv2",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "antitrackingPlaceholder": "cliqz.com/tracking",
    "antitrackingHeader": "CLIQZ-AntiTracking",
    "FRESHTAB_TITLE": "Cliqz Tab",
  }),
  'default_prefs' : {
    "modules.context-search.enabled": false,
    "modules.history.enabled": true,
    "modules.dropdown.enabled": false,
    "modules.type-filter.enabled": false,
    "modules.antitracking-blocker.enabled": false,
    "modules.history-analyzer.enabled": false,
    "modules.browser-panel.enabled": false,
    "modules.offers-cc.enabled": false,
    "proxyPeer": false,
    "proxyTrackers": false,
    "modules.cookie-monster.enabled": true,
    "friends.enable.level": "development",
  },
  "modules": [
    'core',
    'telemetry',
    'core-cliqz',
    'dropdown',
    'webextension-specific',
    'static',
    'geolocation',
    'omnibox',
    'human-web',
    'anti-phishing',
    'freshtab',
    'antitracking',
    'webrequest-pipeline',
    'performance',
    'hpnv2',
    'control-center',
    'offers-v2',
    'offers-banner',
    'popup-notification',
    'offers-debug',
    'browser-panel',
    'message-center',
    'anolysis',
    'anolysis-cc',
    'abtests',
    'context-search',
    'privacy-dashboard',
    'adblocker',
    'https-everywhere',
    'onboarding-v3',
    'type-filter',
    'history',
    'offers-cc',
    'video-downloader',
    'market-analysis',
    'p2p',
    'pairing',
    'antitracking-blocker',
    'search',
    'cookie-monster',
    'myoffrz-helper',
    'insights'
  ],
  "bundles": [
    "hpnv2/worker.wasm.bundle.js",
    "hpnv2/worker.asmjs.bundle.js",
    "core/content-script.bundle.js",
    "webextension-specific/app.bundle.js",
    "offers-cc/offers-cc.bundle.js",
    "freshtab/home.bundle.js",
    "dropdown/dropdown.bundle.js",
    "dropdown/debug.bundle.js",
    "control-center/control-center.bundle.js",
    "browser-panel/browser-panel.bundle.js",
    "cliqz-for-friends/referral.bundle.js",
    "toolbox/toolbox.bundle.js",
    "video-downloader/video-downloader.bundle.js",
    "pairing/pairing.bundle.js",
    "human-web/rusha.bundle.js",
    "privacy-dashboard/dashboard.bundle.js",
    "search/debug.bundle.js",
    "search/inspect.bundle.js",
    "search/mixer.bundle.js",
    "anti-phishing/phishing-warning.bundle.js",
  ],
  system: Object.assign({}, base.systemConfig, {
    map: Object.assign({}, base.systemConfig.map, {
      "ajv": "node_modules/ajv/dist/ajv.min.js",
      "jsep": "modules/vendor/jsep.min.js",
    })
  }),
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie'
    }),
  })
}
