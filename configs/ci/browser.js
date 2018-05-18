const browserBase = require('../browser');
const subprojects = require('../common/subprojects/bundles');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',

    // Make sure that CI configs use staging Anolysis endpoint
    ANOLYSIS_BACKEND_URL: 'https://anolysis.privacy.clyqz.com',
    'freshtab.search.mode': 'urlbar',
  }),
  modules: browserBase.modules
    .filter(m => m !== 'onboarding-v3')
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
  ])),
});
