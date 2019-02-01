const configBase = require('../browser');
const publish = require('../common/publish');

const id = 'cliqz@cliqz.com';
const packageName = 'cliqz';
const channel = 'browser_pre';
const artifactUrlPrefix = publish.edgeLatestUrl(channel);
const updateS3Url = `${publish.edgeLatestS3Url(channel)}updates.json`;
const updateUrl = `${artifactUrlPrefix}updates.json`;
const artifactUrl = `${artifactUrlPrefix}latest.xpi`;

module.exports = Object.assign({}, configBase, {
  sign: 'python ./xpi-sign/xpisign.py -k $CLIQZ_CERT_PATH --signer openssl --passin file:$CLIQZ_CERT_PASS_PATH '+packageName+'-$VERSION.zip '+packageName+'-$PACKAGE_VERSION.xpi',
  publish: `${publish.toPrereleaseFullName(packageName, channel, 'cliqz', 'xpi')} && \
     aws s3 cp build/updates.json ${updateS3Url} --acl public-read && \
     python ./fern/submitter.py -a "http://balrog-admin.10e99.net/api" -r "${channel}" --addon-id "${id}" --addon-version $VERSION --addon-url "${artifactUrl}"`,
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'browserAppName'
  })
});
