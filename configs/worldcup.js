
const urls = require('./common/urls');
const base = require('./common/system');
const subprojects = require('./common/subprojects/bundles');

module.exports = {
  "platform": "web",
  "brocfile": "Brocfile.worldcup.js",
  "pack": "echo ok",
  "publish": "aws s3 sync build s3://cdncliqz/update/edge/worldcup/$BRANCH_NAME/$VERSION/ --acl public-read && aws s3 sync s3://cdncliqz/update/edge/worldcup/$BRANCH_NAME/$VERSION/ s3://cdncliqz/update/edge/worldcup/$BRANCH_NAME/latest/ --acl public-read",
  "settings": Object.assign({}, urls, {
  }),
  "default_prefs" : {
  },
  "modules": [
   'worldcup'
  ],
  "subprojects": subprojects([
    'react',
    'reactDom'
  ]),
  "bundles": [
    'worldcup/worldcup.bundle.js'
  ],
  system: Object.assign({}, base.systemConfig, {}),
  builderDefault: base.builderConfig,
}
