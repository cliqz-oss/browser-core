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
  new Funnel(modules.bower, { destDir: 'bower_components' }),
  new Funnel(modules.modules, { destDir: 'modules' }),
  new Funnel(modules.static, { destDir: 'modules' }),
  new Funnel(modules.bundles, { destDir: 'modules' }),
], { overwrite: true } );

var configTree = util.injectConfig(chromiumTree, config, 'cliqz.json', [
  'modules/core/config.js'
]);

// Compile Human-web
const funnel = require('broccoli-funnel');
const replace = require('broccoli-string-replace');

const appRoot = 'subprojects/chrome-test-hw-hpn/hw/';

const html = funnel(appRoot, {
  include   : ['**/*'],
  destDir : 'human-web/'
});

const outputList = [html];

// IMPORTANT: adding required keys to manifest for Chravira to work
if (cliqzConfig.environment === 'production') {
  // path relative to ./fern folder
  const manifestPath = '../specific/chromium/manifest.json';
  const originalManifest = require(manifestPath);
  const manifest = Object.assign(originalManifest, {
    "chrome_url_overrides": {
      "cliqz-popup": "index.html"
    }
  });
  const manifestFile = writeFile('manifest.json', JSON.stringify(manifest, null, 2));
  outputList.push(manifestFile);
}

var _outputTree = new MergeTrees(outputList, { overwrite: true });
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);

var _configTree = util.injectConfig(_outputTree, config, 'cliqz.json', [
	'human-web/human-web.js',
  'human-web/cl-utils.js',
]);

_outputTree = new MergeTrees([
	_outputTree,
	_configTree
	], { overwrite: true }
)

var outputTree = new MergeTrees([
  specific,
  chromiumTree,
  configTree,
  _outputTree
], { overwrite: true });


// Output
module.exports = outputTree;
