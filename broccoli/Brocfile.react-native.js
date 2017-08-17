var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var writeFile = require('broccoli-file-creator');

var util = require('./util');
var cliqzConfig = require('./config');
var modules = require('./modules-tree');

// cliqz.json should be saved after not transpiled modules are removed from configration
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

var v8 = new MergeTrees([
  new Funnel(modules.static, { destDir: 'modules' }),
  new Funnel(modules.modules, { destDir: 'modules' }),
  new Funnel(modules.bower, { destDir: 'modules/bower_components'}),
  new Funnel(config,  { destDir: 'config'}),
  new Funnel('specific/react-native'),
]);

var configTree = util.injectConfig(v8, config, 'cliqz.json', ['modules/core/config.js']);

module.exports = new MergeTrees([v8, configTree], { overwrite: true });
