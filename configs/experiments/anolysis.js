const artifact = 'anolysis-$PACKAGE_VERSION';
const target = 'alpine-x64-8.9.4';
const entrypoint = './build/anolysis/internals/simulation.entrypoint.js';
const s3 = 's3://cdncliqz/update/edge/anolysis/$BRANCH_NAME';

module.exports = {
  platform: 'node',
  brocfile: 'node.Brocfile.js',
  baseURL: '/cliqz/',
  pack: `nexe -i ${entrypoint} -o ${artifact} -t ${target} && gzip --best ${artifact}`,
  publish: `aws s3 cp ${artifact}.gz ${s3}/$VERSION.gz && aws s3 cp ${s3}/$VERSION.gz ${s3}/latest.gz`,
  sourceMaps: false,
  format: 'common',
  settings: {
    channel: 'ANOLYSIS',
  },
  default_prefs: {
    showConsoleLogs: true,
    developer: false,
  },
  bundles: [],
  modules: [
    'core',
    'anolysis',
  ],
};
