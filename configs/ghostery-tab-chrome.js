const ghosteryBase = require('./ghostery-tab-base');
const id = 'ifnpgdmcliingpambkkihjlhikmbbjid';

module.exports = Object.assign({}, ghosteryBase, {
  CUSTOM_MANIFEST_PERMISSIONS: '"commands",',
  CUSTOM_MANIFEST_PAGE_ACTION_POPUP: '"default_popup": "popup/popup.html",',
  QUICK_SEARCH_TOGGLE: 'Ctrl+K',
  publish: 'webstore upload --client-id=$UPLOAD_API_KEY --client-secret=$UPLOAD_API_SECRET --source ghostery_start_tab_nightly_-$VERSION.zip --extension-id ' + id + ' && webstore publish --client-id=$UPLOAD_API_KEY --client-secret=$UPLOAD_API_SECRET --extension-id ' + id,
  settings: Object.assign({}, ghosteryBase.settings, {
    "channel": "GT12",
  }),
});
