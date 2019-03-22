const configBase = require('../ghostery-tab-chrome');
const publish = require('../common/publish');

const MODULE_BLACKLIST = [
  'toolbox',
];

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('ghostery_start_tab', 'ghosterytab_pre', 'chrome', 'zip'),
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
