const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'eoofgbeobdepdoihpmogabekjddpcbei';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('myoffrz', 'offers_pre', 'chrome', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'offersAppName',
    channel: 'MO10', // MyOffrz Chrome Release
  }),
  modules: configBase.modules,
  default_prefs: Object.assign({}, configBase.default_prefs, {
    showConsoleLogs: false,
    developer: false,
  }),
});
