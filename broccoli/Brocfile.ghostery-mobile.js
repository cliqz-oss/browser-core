/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const broccoliSource = require('broccoli-source');
const writeFile = require('broccoli-file-creator');

const WatchedDir = broccoliSource.WatchedDir;

const util = require('./util');
const cliqzConfig = require('./config');
const cliqzEnv = require('./cliqz-env');
const modules = require('./modules-tree');

const specific = new WatchedDir('specific/node');

// cliqz.json should be saved after not transpiled modules are removed from configration
const config = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzEnv.SOURCE_MAPS);
console.log(cliqzConfig);
// cliqz.json is finalized

const sourceTree = modules.bundles;

const assets = new MergeTrees([
  sourceTree,
  modules.static,
]);

const srcTree = new MergeTrees([
  specific,
  config,
  modules.modules,
  modules.bundles,
  new Funnel(assets, { destDir: 'assets' }),
], { overwrite: true });

const configTree = util.injectConfig(srcTree, config, 'cliqz.json', [
  'core/config.js'
]);

const outputTree = new MergeTrees([
  srcTree,
  modules.styleTests,
  configTree,
], { overwrite: true });

// Output
module.exports = new Funnel(outputTree, {
  exclude: ['**/vendor/!(react.js|react-dom.js)'],
});
