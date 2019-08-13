const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const broccoliSource = require('broccoli-source');
const writeFile = require('broccoli-file-creator');

const WatchedDir = broccoliSource.WatchedDir;

const util = require('./util');
const cliqzConfig = require('./config');
const modules = require('./modules-tree');

const specific = new WatchedDir('specific/node');

// cliqz.json should be saved after not transpiled modules are removed from configration
const config = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

const sourceTree = modules.bundles;

const assets = new MergeTrees([
  sourceTree,
  modules.static,
]);

const srcTree = new MergeTrees([
  specific,
  config,
  modules.modules,
  modules.static,
  modules.bundles,
  new Funnel(assets, { destDir: 'assets' }),
], { overwrite: true });

const configTree = util.injectConfig(srcTree, config, 'cliqz.json', [
  'core/config.js'
]);

const outputTree = new MergeTrees([
  srcTree,
  modules.styleTests,
  configTree,
], { overwrite: true });

// Output
module.exports = outputTree;
