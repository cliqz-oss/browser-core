const webextensionBase = require('../cliqz-tab');

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
    'logger.offers-v2.level': 'debug',
    showConsoleLogs: true,
  },
  bundles: webextensionBase.bundles.concat([
    'integration-tests/run.bundle.js',
  ]),
});
