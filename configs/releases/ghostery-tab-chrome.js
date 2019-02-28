const configBase = require('../ghostery-tab');
const publish = require('../common/publish');

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrerelease('ghostery_start_tab_with_private_search_beta_', 'ghosterytab_pre', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    name: 'ghosteryTabAppName',
    channel: 'GT10', // Ghostery Tab Chrome Release
  }),
  default_prefs: Object.assign({}, configBase.default_prefs, {
    showConsoleLogs: false,
    developer: false,
  }),
});
