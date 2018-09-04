const browserBase = require('../browser');
const ciUrl = require('./common/urls');
const subprojects = require('../common/subprojects/bundles');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',
    'freshtab.search.mode': 'urlbar',
  }, ciUrl),
  default_prefs: Object.assign({}, browserBase.default_prefs, {
    freshtabConfig: JSON.stringify({
      background: {
        image: 'bg-default'
      }
    }),
  }),
  modules: browserBase.modules
    .concat([
      'dropdown-tests',
      'integration-tests',
    ]),
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
