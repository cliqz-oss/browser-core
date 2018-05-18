'use strict';
const Source = require('broccoli-source');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');

const modules = require('./modules-tree');
const cliqzConfig = require('./config');

const specificTree = new Source.WatchedDir('specific/webextension');

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
  modules.modules,
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

module.exports = new MergeTrees([
  modulesTree,
  specificTree,
  localesTree,
]);
