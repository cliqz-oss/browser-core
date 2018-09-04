'use strict';
const Source = require('broccoli-source');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const writeFile = require('broccoli-file-creator');

const util = require('./util');
const modules = require('./modules-tree');
const cliqzConfig = require('./config');

const specific = cliqzConfig.specific || 'webextension';
let specificTree = new Source.WatchedDir('specific/'+specific);

const localesTree = new Funnel(modules.static, {
  srcDir: 'static/locale',
  include: [
    '**/*',
  ],
  exclude: [
    '__*/**/*',
  ],
  destDir: '_locales',
});

const sourceTree = new MergeTrees([
  modules.bundles,
], {
  overwrite: true
});

const modulesTree = new Funnel(
  new MergeTrees([
    modules.static,
    sourceTree,
    modules.styleTests,
  ]), {
    destDir: 'modules'
  }
);

const config = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
const configTree = util.injectConfig(specificTree, config, 'cliqz.json', [
  'manifest.json',
]);

specificTree = new MergeTrees([
  specificTree,
  configTree,
], { overwrite: true });

module.exports = new MergeTrees([
  modulesTree,
  specificTree,
  localesTree,
]);
