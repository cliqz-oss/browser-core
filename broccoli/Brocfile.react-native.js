"use strict";

var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var writeFile = require('broccoli-file-creator');

var util = require('./util');
var cliqzConfig = require('./config');
var modules = require('./modules-tree');
var components = require('./react-components');
var resources = require('./resources');

// cliqz.json should be saved after not transpiled modules are removed from configration
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

var v8 = new MergeTrees([
  new Funnel(modules.static, { destDir: 'modules' }),
  new Funnel(modules.modules, { destDir: 'modules' }),
  new Funnel(modules.bundles, { destDir: 'modules' }),
  modules.locales,
  new Funnel(config,  { destDir: 'config'}),
  new Funnel('specific/react-native'),
  new Funnel(components),
  new Funnel(resources),
], { overwrite: true });

var configTree = util.injectConfig(v8, config, 'cliqz.json', ['modules/core/config.js']);

module.exports = new MergeTrees([v8, configTree], { overwrite: true });
