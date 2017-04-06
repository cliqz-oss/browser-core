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

var src = new Funnel(modules.modules, {
  destDir: 'chrome/content',
  exclude: ['tests/*/content/**/*']
});


var firefoxTree = new MergeTrees([
  firefoxSpecific,
  new Funnel(config,              { destDir: 'chrome/content'}),
  new Funnel(firefoxLibs,         { destDir: 'modules/extern' }),
  new Funnel(modules.bower,       { destDir: 'chrome/content/bower_components' }),
  src,
  new Funnel(modules.static,      { destDir: 'chrome/content' }),
  new Funnel(modules.styleTests,  { destDir: 'chrome/content' }),
], { overwrite: true } );

var firefoxOutputTrees = [
  new Funnel(firefoxTree, { destDir: cliqzConfig.settings.id }),
  firefoxPackage,
];

// TODO: move to modules-tree
if (cliqzConfig.environment !== 'production') {
  var contentTestsTree = new Funnel(modules.modules, {
    include: ['tests/*/content/**/*']
  });
  var contentTests = concat(contentTestsTree, {
    header: ";System = { register: function () {arguments[2]().execute(); }};",
    inputFiles: "**/*.js",
    outputFile: 'tests/tests.js',
    allowNone: true
  })
  firefoxOutputTrees.push(contentTests);
}

var firefox = new MergeTrees(firefoxOutputTrees);

var configTree = util.injectConfig(firefox, config, 'cliqz.json', [
  cliqzConfig.settings.id + '/chrome/content/core/processScript.js',
  cliqzConfig.settings.id + '/chrome/content/core/config.js',
  cliqzConfig.settings.id + '/install.rdf',
  cliqzConfig.settings.id + '/chrome/content/human-web/human-web.js',
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
