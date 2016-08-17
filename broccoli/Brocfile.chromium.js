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
// input trees
var root            = new UnwatchedDir('.');
var nodeModules     = new UnwatchedDir('node_modules');
var specific        = new WatchedDir('specific/chromium');


// cliqz.json should be saved after not transpiled modules are removed from configration
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized


var chromiumTree = new MergeTrees([
  new Funnel(config, { destDir: 'modules'}),
  new Funnel(modules.bowerComponents, { destDir: 'bower_components' }),
  new Funnel(modules.modules, { destDir: 'modules' }),
], { overwrite: true } );

var configTree = util.injectConfig(chromiumTree, config, 'cliqz.json', [
 'modules/core/config.js'
]);

var outputTree = new MergeTrees([
  specific,
  chromiumTree,
  configTree
], { overwrite: true });

// Output
module.exports = outputTree;
