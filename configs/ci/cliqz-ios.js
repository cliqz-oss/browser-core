const base = require('../cliqz-ios');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, base, {
  settings: Object.assign({}, base.settings, ciUrl),
  default_prefs: Object.assign({}, base.default_prefs, {
    developer: true,
    showConsoleLogs: true,
  }),
});
