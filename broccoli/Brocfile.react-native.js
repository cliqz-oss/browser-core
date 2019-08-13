const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const writeFile = require('broccoli-file-creator');

const util = require('./util');
const cliqzConfig = require('./config');
const modules = require('./modules-tree');
const components = require('./react-components');
const resources = require('./resources');

// cliqz.json should be saved after not transpiled modules are removed from configration
const config = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

const v8 = new MergeTrees([
  new Funnel(modules.static, { destDir: 'modules' }),
  new Funnel(modules.modules, { destDir: 'modules' }),
  new Funnel(modules.bundles, { destDir: 'modules' }),
  modules.locales,
  new Funnel(config, { destDir: 'config' }),
  new Funnel('specific/react-native'),
  new Funnel(components),
  new Funnel(resources),
], { overwrite: true });

const configTree = util.injectConfig(v8, config, 'cliqz.json', ['modules/core/config.js']);

module.exports = new MergeTrees([v8, configTree], { overwrite: true });
