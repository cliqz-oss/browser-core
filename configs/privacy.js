/**
 * Privacy config:
 * Privacy components (anti-tracking, adblocker etc) as a webextension for the Geckoview platform.
 */

const urls = require('./common/urls-ghostery');
const publish = require('./common/publish');

module.exports = {
  platform: 'webextension',
  brocfile: 'Brocfile.privacy.js',
  specific: 'privacy',
  baseURL: '/modules/',
  pack: 'web-ext build -s build -a .',
  publish: publish.toPrerelease('cliqz_privacy', 'cliqz_privacy', 'zip'),
  sourceMaps: false,
  versionInfix: '.',
  versionPrefix: '12',
  settings: Object.assign({}, urls, {
    channel: 'MA60',
    MSGCHANNEL: 'web-extension',
    OFFERS_CHANNEL: 'ghostery',
    ATTRACK_TELEMETRY_PROVIDER: 'hpnv2',
    ADBLOCKER_PLATFORM: 'desktop',
    HW_CHANNEL: 'ghostery',
    antitrackingPlaceholder: 'ghostery',
    antitrackingHeader: 'Ghostery-AntiTracking',
  }),
  default_prefs: {
    'modules.webextension-specific.enabled': false,
    'cliqz-adb': 1,
    'cliqz-adb-strict': true,
    attrackBloomFilter: false,
    attrackTelemetryMode: 0,
    attrackDefaultAction: 'placeholder',
    sendAntiTrackingHeader: false,
    attrackCookieTrustReferers: true,
    'attrack.cookieMode': 'trackers',
    attrackBlockCookieTracking: false,
  },
  bundles: [
    'webextension-specific/app.bundle.js',
    'core/content-script.bundle.js',
  ],
  modules: [
    'core',
    'antitracking',
    'webrequest-pipeline',
    'adblocker',
    'anolysis',
    'core-cliqz',
    'abtests-legacy',
    'webextension-specific',
    'telemetry',
    'cookie-monster',
  ],
};
