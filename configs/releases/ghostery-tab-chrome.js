const configBase = require('../ghostery-tab');
const publish = require('../common/publish');

const MODULE_BLACKLIST = [
  'overlay',
];

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrerelease('ghostery_tab_with_private_search_beta_', 'ghosterytab_pre', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    name: 'ghosteryTabAppName',
    channel: 'GT10', // Ghostery Tab Chrome Release
  }),
  modules: configBase.modules.filter(m => MODULE_BLACKLIST.indexOf(m) === -1),
  default_prefs: Object.assign({}, configBase.default_prefs, {
    showConsoleLogs: false,
    developer: false,
  }),
});
