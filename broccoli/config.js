/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const fs = require('fs');
const path = require('path');

const configFilePath = process.env.CLIQZ_CONFIG_PATH;
console.log('Configuration file:', configFilePath);

const cliqzConfig = require(path.resolve(configFilePath));

if (!cliqzConfig.modules) {
  cliqzConfig.modules = fs
    .readdirSync(path.join('.', 'modules'))
    .filter(dir => fs.lstatSync(path.join('.', 'modules', dir)).isDirectory());
}

cliqzConfig.environment = process.env.CLIQZ_ENVIRONMENT || 'development';
cliqzConfig.isBeta = process.env.CLIQZ_BETA === 'True';

cliqzConfig.EXTENSION_VERSION = process.env.EXTENSION_VERSION;
cliqzConfig.VERSION = process.env.VERSION;

if (process.env.EXTENSION_LOG) {
  cliqzConfig.EXTENSION_LOG = process.env.EXTENSION_LOG;
}

module.exports = cliqzConfig;
