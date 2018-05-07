const reactnativeBase = require('../react-native');

module.exports = Object.assign({}, reactnativeBase, {
  settings: Object.assign({}, reactnativeBase.settings, {
    channel: '99',
  }),
  default_prefs: {
    showConsoleLogs: true,
  },
});