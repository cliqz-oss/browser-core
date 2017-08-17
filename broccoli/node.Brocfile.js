"use strict";

var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var broccoliSource = require('broccoli-source');
var concat = require('broccoli-sourcemap-concat');
var writeFile = require('broccoli-file-creator');

var WatchedDir = broccoliSource.WatchedDir;
var UnwatchedDir = broccoliSource.UnwatchedDir;

var util = require('./util');
var cliqzConfig = require('./config');
var modules = require('./modules-tree');

var specific = new WatchedDir('specific/node');

// cliqz.json should be saved after not transpiled modules are removed from configration
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

var assets = new MergeTrees([
  modules.bundles,
  modules.static,
  new Funnel(specific, { srcDir: 'modules' }),
]);

var srcTree = new MergeTrees([
  specific,
  config,
  new Funnel(modules.bower,   { destDir: 'bower_components' }),
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
  configTree,
], { overwrite: true });

// Output
module.exports = outputTree;
