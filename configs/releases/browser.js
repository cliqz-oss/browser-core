const configBase = require('../browser');
const publish = require('../common/publish');

const id = 'cliqz@cliqz.com';
const packageName = 'cliqz';
const channel = 'browser_pre';
const artifactUrlPrefix = publish.edgeLatestUrl(channel);
const updateS3Url = `${publish.edgeLatestS3Url(channel)}updates.json`;
const artifactUrl = `${artifactUrlPrefix}latest.xpi`;

// beta only modules are removed from the release build
const BETA_MODULES = [
  'privacy',
  'privacy-migration',
  'history-analyzer',
  'toolbox'
];

module.exports = Object.assign({}, configBase, {
  updateURL: 'https://s3.amazonaws.com/cdncliqz/update/browser/updates.json',
  sign: 'python ./xpi-sign/xpisign.py -k $CLIQZ_CERT_PATH --signer openssl --passin file:$CLIQZ_CERT_PASS_PATH ' + packageName + '-$VERSION.zip ' + packageName + '-$PACKAGE_VERSION.xpi',
  publish: `${publish.toPrereleaseFullName(packageName, channel, 'cliqz', 'xpi')} && \
     aws s3 cp build/updates.json ${updateS3Url} --acl public-read && \
     python ./fern/submitter.py -a "http://balrog-admin.10e99.net/api" -r "${channel}" --addon-id "${id}" --addon-version $VERSION --addon-url "${artifactUrl}"`,
  modules: configBase.modules.filter(m => BETA_MODULES.indexOf(m) === -1),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'browserAppName'
  }),
  default_prefs: Object.assign({}, configBase.default_prefs, {
    'historyLookupEnabled': false,
  })
});
