const browserBase = require('../browser');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',
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
});
