const offersBase = require('../offers.js');

module.exports = Object.assign({}, offersBase, {
  settings: Object.assign({}, offersBase.settings, {
    channel: '99',
    antitrackingPlaceholder: "cliqz.com/tracking",
    antitrackingHeader: "CLIQZ-AntiTracking",
  }),
  modules: offersBase.modules.concat([
    'adblocker',
    'integration-tests',
    'content-script-tests',
  ]),
  default_prefs: {
    'logger.offers-v2.level': 'debug',
    showConsoleLogs: true,
  },
  bundles: offersBase.bundles.concat([
    'integration-tests/run.bundle.js',
  ]),
});
