const base = require('../base/mobile-cards');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, base, {
  settings: Object.assign({}, base.settings, ciUrl, {
    "CLEAR_RESULTS_AT_SESSION_START": true,
    'search.config.operators.streams.waitForAllProviders': true,
  }),
  default_prefs: Object.assign({}, base.default_prefs, {
    showConsoleLogs: true,
    developer: true,
    historyLookupEnabled: false,
  }),
  modules: base.modules.concat([
    'integration-tests',
    'content-script-tests',
  ]),
  bundles: base.bundles.concat([
    'integration-tests/run.bundle.js',
  ]),
});
