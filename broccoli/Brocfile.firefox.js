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
var nodeModules     = new UnwatchedDir('node_modules');
var specific        = new WatchedDir('specific');
var firefoxSpecific = new Funnel(specific, { srcDir: 'firefox/cliqz@cliqz.com' });
var firefoxPackage  = new Funnel(specific, { srcDir: 'firefox/package' });

// cliqz.json should be saved after not transpiled modules are removed from configration
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

var firefoxLibs = new MergeTrees([
  new Funnel(nodeModules, { srcDir: 'es6-micro-loader/dist', include: ['system-polyfill.js'] }),
]);

var firefoxTree = new MergeTrees([
  firefoxSpecific,
  new Funnel(config,      { destDir: 'chrome/content'}),
  new Funnel(firefoxLibs, { destDir: 'modules/extern' }),
  new Funnel(modules.bower,   { destDir: 'chrome/content/bower_components' }),
  new Funnel(modules.modules,     { destDir: 'chrome/content' }),
  new Funnel(modules.static,     { destDir: 'chrome/content' }),
], { overwrite: true } );

var firefox = new MergeTrees([
  new Funnel(firefoxTree, { destDir: cliqzConfig.settings.id }),
  firefoxPackage,
]);

var configTree = util.injectConfig(firefox, config, 'cliqz.json', [
  cliqzConfig.settings.id + '/modules/Extension.jsm',
  cliqzConfig.settings.id + '/chrome/content/core/processScript.js',
  cliqzConfig.settings.id + '/chrome/content/core/config.js',
  cliqzConfig.settings.id + '/install.rdf',
  'templates/install.rdf',
  'templates/latest.rdf',
  'fabfile.py'
]);

firefox = new MergeTrees([
  firefox,
  configTree
], { overwrite: true });

// Output
module.exports = firefox;
