
const edgeBucket = 's3://cdncliqz/update/edge';

module.exports = {
  toEdge(artifact, configName, extension='tgz') {
    const artifactName = `${artifact}-$PACKAGE_VERSION.${extension}`;
    const s3Path = `${edgeBucket}/${configName}/$BRANCH_NAME/$VERSION.$\{GIT_COMMIT:0:7\}.${extension}`;
    const latestPath = `${edgeBucket}/${configName}/$BRANCH_NAME/latest.${extension}`;
    return `aws s3 cp ${artifactName} ${s3Path} --acl public-read && aws s3 cp ${s3Path} ${latestPath} --acl public-read`;
  }
}