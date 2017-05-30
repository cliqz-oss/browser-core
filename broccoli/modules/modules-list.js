'use strict';
const camelCase = require('camelcase');
const writeFile = require('broccoli-file-creator');
const config = require('../config');

let modulesList = '';
config.modules.forEach((module) => {
  const importStatement = [
    'import',
    camelCase(module) + "Module",
    'from',
    "'../../" + module + "/index';",
  ].join(' ');
  modulesList += importStatement;
});
modulesList += 'export default {';
config.modules.forEach((module, i) => {
  modulesList += "'"+module+"': "+camelCase(module)+"Module";
  if (i < config.modules.length -1) {
    modulesList += ",";
  }
});
modulesList += '};';

module.exports = writeFile('modules.es', modulesList);
