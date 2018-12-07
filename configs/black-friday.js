const urls = require('./common/urls');
const base = require('./common/system');

module.exports = {
  "platform": "web",
  "baseURL": "/modules/",
  "brocfile": "Brocfile.black-friday.js",
  "pack": "echo ok",
  "publish": "aws s3 sync build s3://cdncliqz/update/edge/black-friday/$BRANCH_NAME/$VERSION/ --acl public-read && aws s3 sync s3://cdncliqz/update/edge/black-friday/$BRANCH_NAME/$VERSION/ s3://cdncliqz/update/edge/black-friday/$BRANCH_NAME/latest/ --acl public-read",
  "settings": Object.assign({}, urls, {
  }),
  "default_prefs" : {
  },
  "modules": [
   'black-friday'
  ],
  "bundles": [
    'black-friday/black-friday.bundle.js'
  ],
  system: Object.assign({}, base.systemConfig, {}),
  builderDefault: base.builderConfig,
}
