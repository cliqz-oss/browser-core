const configBase = require('../ghostery-tab-firefox');
const publish = require('../common/publish');
const MODULE_BLACKLIST = [
  'toolbox',
];
const id = 'firefoxtab@ghostery.com';
const CUSTOM_MANIFEST_ENTRY = `
  ,"applications": {
    "gecko": {
      "id": "${id}"
    }
  }
`;

module.exports = Object.assign({}, configBase, {
  CUSTOM_MANIFEST_ENTRY,
  publish: publish.toPrereleaseFullName('ghostery_start_tab', 'ghosterytab_pre', 'firefox', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'ghosteryTabAppNameFirefox',
    channel: 'GT00', // Ghostery Tab Firefox Release
  }),
  modules: configBase.modules.filter(m => MODULE_BLACKLIST.indexOf(m) === -1),
  default_prefs: Object.assign({}, configBase.default_prefs, {
    showConsoleLogs: false,
    developer: false,
  }),
});
