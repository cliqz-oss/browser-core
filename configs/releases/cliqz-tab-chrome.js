const configBase = require('../cliqz-tab');
const publish = require('../common/publish');

const id = 'jagljfhhkmnjajmkkkmomddipnifkkmn';
const MODULE_BLACKLIST = [
  'overlay',
];

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrerelease('cliqz_tab_beta_', 'cliqztab_pre', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'appName',
    channel: 'CT10', // Cliqz Tab Chrome Release
  }),
  modules: configBase.modules.filter(m => MODULE_BLACKLIST.indexOf(m) === -1),
  default_prefs: Object.assign({}, configBase.default_prefs, {
    showConsoleLogs: false,
    developer: false,
  }),
});
