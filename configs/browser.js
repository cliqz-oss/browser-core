/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
  platform: 'webextension',
  specific: 'browser',
  baseURL: '/modules/',
  pack: 'web-ext build -s build -a .',
  sign: `python ./xpi-sign/xpisign.py -k $CLIQZ_CERT_PATH --signer openssl --passin file:$CLIQZ_CERT_PASS_PATH ${packageName}-$VERSION.zip ${packageName}-$PACKAGE_VERSION.xpi`,
  publish: `${publish.toEdge(packageName, channel, 'xpi')} && \
     aws s3 cp build/updates.json ${updateS3Url} --acl public-read && \
     python ./fern/submitter.py -a "http://balrog-admin.10e99.net/api" -r "${channel}" --addon-id "${id}" --addon-version $VERSION --addon-url "${artifactUrl}"`,
  testsBasePath: './build/modules',
  updateURL: updateUrl,
  updateURLbeta: updateUrl,
  versionDistance: true,
  artifactUrl,
  settings: Object.assign({}, urls, settings, {
    id,
    name: 'browserAppNameNightly',
    channel: '40',
    homepageURL: 'https://cliqz.com/',
    freshTabNews: true,
    freshTabStats: true,
    helpMenus: true,
    suggestions: false,
    onboardingVersion: 4,
    onBoardingPref: 'browserOnboarding',
    ENDPOINT_ANONPATTERNSURL: 'https://cdn.cliqz.com/browser-f/patterns-anon',
    ENDPOINT_HUMAN_WEB_PATTERNS: 'https://cdn.cliqz.com/browser-f/hw-patterns.gz',
    ENDPOINT_PATTERNSURL: 'https://cdn.cliqz.com/browser-f/patterns',
    HW_CHANNEL: 'cliqz',
    ONBOARDING_URL: 'resource://cliqz/onboarding-v3/index.html',
    HISTORY_URL: 'history/home.html',
    'modules.history.search-path': '?query=',
    ICONS: {
      active: 'control-center/images/cc-active.svg',
      inactive: 'control-center/images/cc-critical.svg',
      critical: 'control-center/images/cc-critical.svg'
    },
    ATTRACK_TELEMETRY_PROVIDER: 'hpnv2',
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    antitrackingPlaceholder: 'cliqz.com/tracking',
    antitrackingHeader: 'CLIQZ-AntiTracking',
    FRESHTAB_TITLE: 'Cliqz Tab',
    INSIGHTS_INTERNAL: true,
  }),
  default_prefs: {
    'modules.context-search.enabled': false,
    'modules.history.enabled': true,
    'modules.browser-panel.enabled': false,
    'modules.offers-cc.enabled': false,
    'modules.offers-reminder.enabled': false,
    'modules.offers-checkout.enabled': false,
    'modules.cookie-monster.enabled': true,
    'friends.enable.level': 'development',
    'modules.search.operators.addCompletion.useTitle': false,
  },
  modules: [
    'core',
    'telemetry',
    'core-cliqz',
    'dropdown',
    'abtests-legacy',
    'webextension-specific',
    'geolocation',
    'omnibox',
    'human-web',
    'anti-phishing',
    'freshtab',
    'news',
    'antitracking',
    'webrequest-pipeline',
    'hpnv2',
    'control-center',
    'offers-v2',
    'offers-banner',
    'browser-panel',
    'anolysis',
    'anolysis-cc',
    'context-search',
    'privacy-dashboard',
    'adblocker',
    'https-everywhere',
    'onboarding-v4',
    'history',
    'offers-cc',
    'offers-reminder',
    'offers-checkout',
    'video-downloader',
    'p2p',
    'pairing',
    'search',
    'cookie-monster',
    'inter-ext-messaging',
    'myoffrz-helper',
    'insights',
    'toolbox',
    'autoconsent',
    'consentric',
    'dat',
    'youtube-fixer',
  ],
  bundles: [
    'anolysis-cc/dashboard/anolysis.bundle.js',
    'adblocker/dashboard/adblocker.bundle.js',
    'hpnv2/worker.wasm.bundle.js',
    'hpnv2/worker.asmjs.bundle.js',
    'core/content-script.bundle.js',
    'webextension-specific/app.bundle.js',
    'offers-cc/offers-cc.bundle.js',
    'offers-cc/offers-cc-after.bundle.js',
    'offers-reminder/offers-reminder.bundle.js',
    'offers-checkout/offers-checkout.bundle.js',
    'freshtab/home.bundle.js',
    'history/home.bundle.js',
    'onboarding-v4/app.bundle.js',
    'dropdown/dropdown.bundle.js',
    'dropdown/debug.bundle.js',
    'control-center/control-center-react.bundle.js',
    'browser-panel/browser-panel.bundle.js',
    'toolbox/toolbox.bundle.js',
    'video-downloader/video-downloader.bundle.js',
    'pairing/pairing.bundle.js',
    'human-web/page.bundle.js',
    'human-web/rusha.bundle.js',
    'privacy-dashboard/dashboard.bundle.js',
    'search/debug.bundle.js',
    'search/inspect.bundle.js',
    'search/mixer.bundle.js',
    'anti-phishing/phishing-warning.bundle.js',
    'webextension-specific/experimental-apis/browser-action/api.bundle.js',
    'webextension-specific/experimental-apis/cliqz/api.bundle.js',
    'webextension-specific/experimental-apis/cliqz/api-child.bundle.js',
    'webextension-specific/experimental-apis/demographics/api.bundle.js',
    'webextension-specific/experimental-apis/omnibox/api.bundle.js',
    'webextension-specific/experimental-apis/omnibox/api-child.bundle.js',
    'webextension-specific/experimental-apis/cliqzHistory/api.bundle.js',
  ],
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      qrcodejs: 'QRCode',
      '@cliqz-oss/dexie': 'Dexie'
    }),
  }),
  buildTargets: {
    firefox: 64,
  },
};
