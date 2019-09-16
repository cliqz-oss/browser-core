/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const edgeBucket = 's3://cdncliqz/update/edge';
const edgeBucketPrefix = 'https://s3.amazonaws.com/cdncliqz/update/edge';

const upload = function (name) {
  return `echo "Uploading version: ${name}"`;
};

module.exports = {
  toEdge(artifact, configName, extension = 'tgz') {
    const artifactName = `${artifact}-$PACKAGE_VERSION.${extension}`;
    const s3Path = `${edgeBucket}/${configName}/$BRANCH_NAME/$VERSION.\${GIT_COMMIT:0:7}.${extension}`;
    const latestPath = `${this.edgeLatestS3Url(configName)}latest.${extension}`;
    return `${upload(artifactName)} && aws s3 cp ${artifactName} ${s3Path} --acl public-read && aws s3 cp ${s3Path} ${latestPath} --acl public-read`;
  },
  edgeLatestS3Url(configName) {
    return `${edgeBucket}/${configName}/${process.env.BRANCH_NAME || '$BRANCH'}/`;
  },
  edgeLatestUrl(configName) {
    return `${edgeBucketPrefix}/${configName}/${process.env.BRANCH_NAME || '$BRANCH'}/`;
  },
  toPrerelease(artifact, configName, extension = 'tgz') {
    const artifactName = `${artifact}-$VERSION.${extension}`;
    const s3Path = `${edgeBucket}/${configName}/$BRANCH_NAME/$VERSION.\${GIT_COMMIT:0:7}.${extension}`;
    const latestPath = `${edgeBucket}/${configName}/$BRANCH_NAME/latest.${extension}`;
    return `${upload(artifactName)} && aws s3 cp ${artifactName} ${s3Path} --acl public-read && aws s3 cp ${s3Path} ${latestPath} --acl public-read`;
  },
  toEdgeForGhostery(artifact, configName, extension = 'tgz') {
    const artifactName = `${artifact}-$VERSION-an+fx.${extension}`;
    const s3Path = `${edgeBucket}/${configName}/$BRANCH_NAME/$VERSION.\${GIT_COMMIT:0:7}.${extension}`;
    const latestPath = `${edgeBucket}/${configName}/$BRANCH_NAME/latest.${extension}`;
    return `${upload(artifactName)} && aws s3 cp ${artifactName} ${s3Path} --acl public-read && aws s3 cp ${s3Path} ${latestPath} --acl public-read`;
  },
  toPrereleaseFullName(artifact, configName, platform, extension = 'tgz') {
    const artifactName = `${artifact}-$VERSION.${extension}`;
    const s3Path = `${edgeBucket}/${configName}/$BRANCH_NAME/${artifact}-${platform}-$VERSION.\${GIT_COMMIT:0:7}.${extension}`;
    const latestPath = `${edgeBucket}/${configName}/$BRANCH_NAME/latest-${platform}.${extension}`;
    return `${upload(artifactName)} && aws s3 cp ${artifactName} ${s3Path} --acl public-read && aws s3 cp ${s3Path} ${latestPath} --acl public-read`;
  }
};
