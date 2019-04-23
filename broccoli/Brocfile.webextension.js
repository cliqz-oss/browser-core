const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const uglify = require('broccoli-uglify-sourcemap');
const specificTree = require('./specific-tree');

const modules = require('./modules-tree');

let sourceTree = modules.bundles;

if (process.env.CLIQZ_ENVIRONMENT === 'production') {
  sourceTree = uglify(sourceTree, {
    uglify: {
      mangle: false, // defaults to true
      compress: true, // defaults to true
      sourceMap: false, // defaults to true
    },
  });
}

const modulesTree = new Funnel(
  new MergeTrees([
    modules.static,
    sourceTree,
    modules.styleTests,
  ]), {
    destDir: 'modules'
  }
);

module.exports = new MergeTrees([
  modulesTree,
  specificTree,
  modules.locales,
]);
