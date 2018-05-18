const browserBase = require('../funnelcake');
const subprojects = require('../common/subprojects/bundles');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',

    // Make sure that CI configs use staging Anolysis endpoint
    ANOLYSIS_BACKEND_URL: 'https://anolysis.privacy.clyqz.com',
  }),
  modules: browserBase.modules.concat([
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
