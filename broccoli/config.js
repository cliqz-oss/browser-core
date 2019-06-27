/* eslint-disable strict, no-console */

'use strict';

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
// TODO remove outdated
cliqzConfig.environment = process.env.CLIQZ_ENVIRONMENT || 'development';

cliqzConfig.use_v6_build = process.env.CLIQZ_V6_BUILD || false;

// source maps
cliqzConfig.sourceMaps = !(process.env.CLIQZ_SOURCE_MAPS === 'false');
cliqzConfig.debugPages = !(process.env.CLIQZ_SOURCE_DEBUG === 'false');

cliqzConfig.EXTENSION_VERSION = process.env.EXTENSION_VERSION;
cliqzConfig.VERSION = process.env.VERSION;

if (process.env.EXTENSION_LOG) {
  cliqzConfig.EXTENSION_LOG = process.env.EXTENSION_LOG;
}

module.exports = cliqzConfig;
