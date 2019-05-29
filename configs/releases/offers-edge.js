const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'myoffrz@cliqz.com';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('myoffrz', 'offers_pre', 'edge', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'offersAppName',
    channel: 'MO20', // MyOffrz MS Edge Release
  }),
  modules: configBase.modules,
  default_prefs: Object.assign({}, configBase.default_prefs, {
    showConsoleLogs: false,
    developer: false,
  }),
});
