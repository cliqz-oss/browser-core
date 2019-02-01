"use strict";

var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var broccoliSource = require('broccoli-source');
var writeFile = require('broccoli-file-creator');
const uglify = require('broccoli-uglify-sourcemap');

var WatchedDir = broccoliSource.WatchedDir;

var util = require('./util');
var cliqzConfig = require('./config');
var modules = require('./modules-tree');

var specific = new WatchedDir('specific/node');

// cliqz.json should be saved after not transpiled modules are removed from configration
var config = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

let sourceTree = modules.bundles;

if (process.env.CLIQZ_ENVIRONMENT === 'production') {
  sourceTree = uglify(sourceTree, {
    uglify: {
      mangle: false,    // defaults to true
      compress: true,  // defaults to true
      sourceMap: false, // defaults to true
    },
  })
}

var assets = new MergeTrees([
  sourceTree,
  modules.static,
]);

var srcTree = new MergeTrees([
  specific,
  config,
  modules.modules,
  modules.static,
  modules.bundles,
  new Funnel(assets, { destDir: 'assets' }),
], { overwrite: true });

var configTree = util.injectConfig(srcTree, config, 'cliqz.json', [
  'core/config.js'
]);

var outputTree = new MergeTrees([
  srcTree,
  modules.styleTests,
  configTree,
], { overwrite: true });

// Output
module.exports = outputTree;
