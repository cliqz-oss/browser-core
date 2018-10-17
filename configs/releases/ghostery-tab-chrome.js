const configBase = require('../ghostery-tab');

const id = 'TODO';
const MODULE_BLACKLIST = [
  'overlay',
];

module.exports = Object.assign({}, configBase, {
  // publish: TODO
  settings: Object.assign({}, configBase.settings, {
    id,
    channel: 'GT10', // Ghostery Tab Chrome Release
  }),
  modules: configBase.modules.filter(m => MODULE_BLACKLIST.indexOf(m) === -1),
  default_prefs: Object.assign({}, configBase.default_prefs, {
    showConsoleLogs: false,
    developer: false,
  }),
});
