/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const writeFile = require('broccoli-file-creator');

const util = require('./util');
const cliqzConfig = require('./config');
const cliqzEnv = require('./cliqz-env');
const modules = require('./modules-tree');
const resources = require('./resources');

// cliqz.json should be saved after not transpiled modules are removed from configration
const config = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzEnv.SOURCE_MAPS);
console.log(cliqzConfig);
// cliqz.json is finalized

const v8 = new MergeTrees([
  new Funnel(modules.static, { destDir: 'modules' }),
  new Funnel(modules.modules, { destDir: 'modules' }),
  new Funnel(modules.bundles, { destDir: 'modules' }),
  modules.locales,
  new Funnel(config, { destDir: 'config' }),
  new Funnel('specific/react-native'),
  new Funnel(resources),
], { overwrite: true });

const configTree = util.injectConfig(v8, config, 'cliqz.json', ['modules/core/config.js']);

module.exports = new MergeTrees([v8, configTree], { overwrite: true });
