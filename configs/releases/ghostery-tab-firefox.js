const configBase = require('../ghostery-tab');

const id = 'TODO';

module.exports = Object.assign({}, configBase, {
  // publish: TODO
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'TODO',
    description: 'TODO',
    channel: 'GT00', // Ghostery Tab Firefox Release
  }),
  default_prefs: Object.assign({}, configBase.default_prefs, {
    showConsoleLogs: false,
    developer: false,
  }),
});
