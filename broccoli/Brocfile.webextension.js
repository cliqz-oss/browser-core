'use strict';
const Source = require('broccoli-source');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');

const modules = require('./modules-tree');

const specificTree = new Source.WatchedDir('specific/webextension');

const sourceTree = new MergeTrees([
  modules.modules,
  modules.bundles,
], { overwrite: true });

const modulesTree = new Funnel(
  new MergeTrees([
    modules.static,
    sourceTree,
    new Funnel(modules.bower, { destDir: 'bower_components' }),
    modules.styleTests,
  ]), {
    destDir: 'modules'
  }
);

module.exports = new MergeTrees([
  modulesTree,
  specificTree,
]);
