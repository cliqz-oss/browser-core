const offersBase = require('../offers');

module.exports = Object.assign({}, offersBase, {
  settings: Object.assign({}, offersBase.settings, {
    channel: '99',
    antitrackingPlaceholder: "cliqz.com/tracking",
    antitrackingHeader: "CLIQZ-AntiTracking",
    offersInfraTests: true,
  }),
  modules: offersBase.modules.concat([
    'adblocker',
    'integration-tests',
    'content-script-tests',
  ]),
  default_prefs: {
    'integration-tests.grep': 'send fake signals to backend through hpn',
    showConsoleLogs: true,
  },
  bundles: offersBase.bundles.concat([
    'integration-tests/run.bundle.js',
  ]),
});
