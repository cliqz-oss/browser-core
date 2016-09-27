"use strict";
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var compileSass = require('broccoli-sass-source-maps');
var concat = require('broccoli-sourcemap-concat');
var AssetRev = require('broccoli-asset-rev');
var writeFile = require('broccoli-file-creator');

var util = require('./util');
var cliqzConfig = require('./config');
var modules = require('./modules-tree');

// input trees
var mobileSpecific  = new Funnel('specific/mobile', { exclude: ['skin/sass/**/*', '*.py'] });

var mobileCss = compileSass(
  ['specific/mobile/skin/sass'],
  'style.sass',
  'style.css',
  { sourceMap: cliqzConfig.sourceMaps }
);

// cliqz.json should be saved after not transpiled modules are removed from configration
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

var mobile = new MergeTrees([
  mobileSpecific,
  new Funnel(config),
  new Funnel(mobileCss,      { destDir: 'skin/css' }),
  new Funnel(modules.bowerComponents, { destDir: 'bower_components' }),
  modules.modules
]);

var platformTests = new Funnel('platforms/'+cliqzConfig.platform, {
  include: ['tests/**/*']
});
var testsTree = concat(platformTests, {
  outputFile: 'tests.js',
  inputFiles: [
    "**/*.js"
  ],
  allowNone: true,
  sourceMapConfig: { enabled: cliqzConfig.sourceMaps },
});

if (cliqzConfig.buildEnv === 'production' ) {
  mobile = new AssetRev(mobile, {
    extensions: ['js', 'css'],
    replaceExtensions: ['html', 'css', 'js'],
    generateAssetMap: true
  });
}

var configTree = util.injectConfig(mobile, config, 'cliqz.json', [
  'core/config.js'
]);

var outputTree = new MergeTrees([
  mobile,
  configTree,
  new Funnel(testsTree, { destDir: 'tests'})
], { overwrite: true });

// Output
module.exports = outputTree;
