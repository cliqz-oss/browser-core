'use strict';
const camelCase = require('camelcase');
const writeFile = require('broccoli-file-creator');
const config = require('../config');
const glob = require('glob');
const path = require('path');

let modulesList = 'import { debugModules } from "../../platform/globals";';
let debugImports = '';
let debugModules = '';

config.modules.forEach((module) => {
  const importStatement = [
    'import',
    camelCase(module) + "Module",
    'from',
    "'../../" + module + "/index';",
  ].join(' ');
  modulesList += importStatement;

  const pathToModules = path.join(process.cwd(), 'modules', module, 'sources');
  const modulesFiles = glob.sync(pathToModules + '/**/*.es', {
    ignore: [
      '/**/*.bundle.es',  // no bundles
      '/**/tests/**/*',   // no tests
      '/**/index.es',     // modules are already included
      '/**/content/**/*', // no content scripts
      '/**/content.es',   // no content scripts 2
      '/**/debug/**/*',   // no debug pages
      '/**/freshtab/home/**/*', // no freshtab
      '/**/worker/**/*'   // no workers
    ]
  }).forEach((file) => {
    const modulePath = path.parse(file.replace(pathToModules + '/', ''));
    const moduleName = path.join(module, modulePath.dir, modulePath.name);
    const moduleVarName = camelCase(moduleName.replace(/[^a-zA-Z0-9]+/g, '_'));

    const importString = [
      `import ${moduleVarName + "Default"}, * as ${moduleVarName}`,
      `from '../../${moduleName}';`
    ].join(' ');

    debugModules += `debugModules['${moduleName}'] = Object.assign(${moduleVarName}, { 'default': ${moduleVarName + "Default"} });\n`;
    debugImports += importString;
  });
});

debugImports += "import configDefault from '../../core/config';";
debugModules += "debugModules['core/config'] = { default: configDefault };\n";

if (!config.PRODUCTION && (config.platform === "firefox")) {
  modulesList += debugImports;
  modulesList += debugModules;
}

modulesList += 'export default {';
config.modules.forEach((module, i) => {
  modulesList += "'"+module+"': "+camelCase(module)+"Module";
  if (i < config.modules.length -1) {
    modulesList += ",";
  }
});
modulesList += '};';

module.exports = writeFile('modules.es', modulesList);
