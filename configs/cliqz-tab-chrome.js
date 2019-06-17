const cliqzBase = require('./cliqz-tab');
const id = 'khlmffibhhjkfjiflcmpiodjmkbkianc';

module.exports = Object.assign({}, cliqzBase, {
  publish: 'webstore upload --client-id=$UPLOAD_API_KEY --client-secret=$UPLOAD_API_SECRET --source cliqz_tab_nightly_-$VERSION.zip --extension-id ' + id + ' && webstore publish --client-id=$UPLOAD_API_KEY --client-secret=$UPLOAD_API_SECRET --extension-id ' + id,
  settings: Object.assign({}, cliqzBase.settings, {
    "channel": "CT12", // Cliqz Tab Chrome Beta
  })
});
