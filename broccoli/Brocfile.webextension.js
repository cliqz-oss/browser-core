/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');

const specificTree = require('./specific-tree');
const modules = require('./modules-tree');

const modulesTree = new Funnel(
  new MergeTrees([
    modules.static,
    modules.bundles,
    modules.styleTests,
  ]), {
    destDir: 'modules'
  }
);

module.exports = new MergeTrees([
  modulesTree,
  specificTree,
  modules.locales,
]);
