const ghosteryBase = require('./ghostery-tab');
const id = 'ifnpgdmcliingpambkkihjlhikmbbjid';

module.exports = Object.assign({}, ghosteryBase, {
  publish: 'webstore upload --client-id=$UPLOAD_API_KEY --client-secret=$UPLOAD_API_SECRET --source ghostery_tab_with_private_search_nightly_-$VERSION.zip --extension-id ' + id + ' && webstore publish --client-id=$UPLOAD_API_KEY --client-secret=$UPLOAD_API_SECRET --extension-id ' + id,
})