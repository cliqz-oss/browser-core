const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');

const specificTree = require('./specific-tree');
const modules = require('./modules-tree');

const modulesTree = new Funnel(
  new MergeTrees([
    modules.static,
    modules.bundles,
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
