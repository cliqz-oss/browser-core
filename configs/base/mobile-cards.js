const base = require('../common/system');
const urls = require('../common/urls-cliqz');

const id = 'android@cliqz.com';
const packageName = 'cliqz';

module.exports = {
  platform: 'webextension',
  specific: 'cliqz-android',
  brocfile: 'Brocfile.webextension.js',
  testsBasePath: './build',
  testem_launchers: ['unit-node', 'Chrome'],
  pack: 'web-ext build -s build -a .',
  sign: `python ./xpi-sign/xpisign.py -k $CLIQZ_CERT_PATH --signer openssl --passin file:$CLIQZ_CERT_PASS_PATH ${packageName}-$PACKAGE_VERSION.zip ${packageName}-$PACKAGE_VERSION-signed.zip && cp ${packageName}-$PACKAGE_VERSION-signed.zip ${packageName}-$PACKAGE_VERSION.zip'`,
  baseURL: '/modules/',
  versionPrefix: '3',
  isMobile: true,
  settings: Object.assign({}, urls, {
    id,
    description: '',
    name: 'Cliqz',
    ATTRACK_TELEMETRY_PROVIDER: 'platform',
    RESULTS_TIMEOUT: 3000,
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    RESULTS_PROVIDER_ORDER: ['calculator', 'history', 'cliqz', 'querySuggestions', 'instant'],
    CLEAR_RESULTS_AT_SESSION_START: false,
    THROTTLE_QUERIES: 50
  }),
  modules: [
    'core',
    'core-cliqz',
    'mobile-cards',
    'search',
    'anolysis',
    'geolocation',
    'control-center',
    'cliqz-android',
    'inter-ext-messaging',
  ],
  bundles: [
    'mobile-cards/debug.bundle.js',
    'mobile-cards/cliqz-android.bundle.js',
    'cliqz-android/app.bundle.js',
    'cliqz-android/cliqz-search-engines.bundle.js',
    'cliqz-android/cliqz-native-bridge.bundle.js',
    'cliqz-android/cliqz-app-constants.bundle.js',
  ],
  builderDefault: base.builderConfig,
  babelPlugins: [
    ['react-native-web', { commonjs: true }]
  ]
};
