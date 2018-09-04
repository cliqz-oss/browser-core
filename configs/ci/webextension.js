const webextensionBase = require('../webextension');
const subprojects = require('../common/subprojects/bundles');

module.exports = Object.assign({}, webextensionBase, {
  settings: Object.assign({}, webextensionBase.settings, {
    channel: '99',
    antitrackingPlaceholder: "cliqz.com/tracking",
    antitrackingHeader: "CLIQZ-AntiTracking",
  }),
  modules: webextensionBase.modules.concat([
    'antitracking',
    'adblocker',
    'integration-tests',
    'dropdown-tests',
    'content-script-tests',
  ]),
  default_prefs: {
    showConsoleLogs: true,
  },
  subprojects: webextensionBase.subprojects.concat(subprojects([
    'chai',
    'chai-dom',
    'mocha',
    'reactTestUtils',
    'sinon',
    'sinon-chai',
  ])),
  bundles: webextensionBase.bundles.concat([
    'integration-tests/run.bundle.js',
    'core/integration-tests.bundle.js',
  ]),
});
