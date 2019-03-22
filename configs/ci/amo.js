const base = require('../amo-webextension');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, base, {
  settings: Object.assign({}, base.settings, ciUrl, {
    channel: '99',
    onBoardingVersion: -1, // Disable onboarding
  }),
  default_prefs: Object.assign({}, base.default_prefs, {
    showConsoleLogs: true,
    developer: true,
    historyLookupEnabled: false,
    'modules.anolysis.enabled': true,
  }),
  modules: base.modules.concat([
    'integration-tests',
    'dropdown-tests',
  ]),
  bundles: base.bundles.concat([
    'integration-tests/run.bundle.js',
  ]),
});