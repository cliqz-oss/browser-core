const browserBase = require('../browser');
const subprojects = require('../common/subprojects/bundles');

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
    'static',
    'integration-tests',
    'ui',
    'webrequest-pipeline',
    'hpn',
    'human-web',
    'offers-v2',
    'offers-debug',
    'offers-cc',
  ],
  subprojects: browserBase.subprojects.concat(subprojects([
    'chai',
    'chai-dom',
    'mocha',
    'core-js',
    'sinon',
    'sinon-chai',
    'reactTestUtils',
  ])),
});
