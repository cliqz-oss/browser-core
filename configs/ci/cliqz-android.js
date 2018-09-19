const base = require('../cliqz-android');
const subprojects = require('../common/subprojects/bundles');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, base, {
  settings: Object.assign({}, base.settings, ciUrl, {
    "CLEAR_RESULTS_AT_SESSION_START": true,
    'search.config.operators.streams.waitForAllProviders': true,
  }),
  default_prefs: Object.assign({}, base.default_prefs, {
    showConsoleLogs: true,
    developer: true,
  }),
  modules: base.modules.concat([
    'integration-tests',
    'content-script-tests',
  ]),
  subprojects: base.subprojects.concat(subprojects([
    'chai',
    'chai-dom',
    'mocha',
    'reactTestUtils',
    'sinon',
    'sinon-chai',
  ])),
  bundles: base.bundles.concat([
    'integration-tests/run.bundle.js',
    'core/integration-tests.bundle.js',
  ]),
});
