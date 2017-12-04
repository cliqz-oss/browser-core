"use strict";
var fs = require('fs');

var configFilePath  = process.env['CLIQZ_CONFIG_PATH'];
console.log('Configuration file:', configFilePath);

var cliqzConfig     = JSON.parse(fs.readFileSync(configFilePath));

// build environment
cliqzConfig.environment = process.env.CLIQZ_ENVIRONMENT || 'development';
cliqzConfig.PRODUCTION = cliqzConfig.environment === 'production';

// source maps
cliqzConfig.sourceMaps = process.env.CLIQZ_SOURCE_MAPS == 'false' ? false : true;
cliqzConfig.debugPages = process.env.CLIQZ_SOURCE_DEBUG == 'false' ? false : true;

cliqzConfig.EXTENSION_VERSION = process.env.EXTENSION_VERSION;

cliqzConfig.instrumentFunctions = process.env.CLIQZ_INSTRUMENT_FUNCTIONS;

module.exports = cliqzConfig;
