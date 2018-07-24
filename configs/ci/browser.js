const browserBase = require('../browser');
const ciUrl = require('./common/urls');
const subprojects = require('../common/subprojects/bundles');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',
    'freshtab.search.mode': 'urlbar',
  }, ciUrl),
  modules: browserBase.modules
    .concat([
      'firefox-tests',
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
