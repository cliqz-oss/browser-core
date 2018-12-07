const browserBase = require('../browser');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',
    offersInfraTests: true,
  }),
  default_prefs: Object.assign({}, browserBase.default_prefs, {
    'integration-tests.grep': 'send fake signals to backend through hpn',
  }),
  modules: [
    'core',
    'core-cliqz',
    'anolysis-remote',
    'static',
    'integration-tests',
    'ui',
    'webrequest-pipeline',
    'hpnv2',
    'human-web',
    'offers-v2',
    'offers-debug',
    'offers-cc',
  ],
});
