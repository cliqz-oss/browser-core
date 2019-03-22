const browserBase = require('../browser');
const ciUrl = require('./common/urls');
module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',
    onBoardingVersion: -1, // Disable onboarding
  }, ciUrl),
  default_prefs: Object.assign({}, browserBase.default_prefs, {
    freshtabConfig: JSON.stringify({
      background: {
        image: 'bg-default'
      }
    }),
    historyLookupEnabled: false,
  }),
  modules: browserBase.modules
    .concat([
      'dropdown-tests',
      'integration-tests',
    ]),
  bundles: browserBase.bundles.concat([
    'core/content-tests.bundle.js',
    'integration-tests/run.bundle.js',
    'integration-tests/experimental-apis/test-helpers/api.bundle.js',
  ]),
});
