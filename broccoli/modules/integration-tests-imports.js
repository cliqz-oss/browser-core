const writeFile = require('broccoli-file-creator');
const config = require('../config');
const glob = require('glob');
const camelCase = require('camelcase');

function createDefaultExportName(parts) {
  return camelCase(
    parts.map(part => part[0].toUpperCase() + part.substr(1).toLowerCase()).join('')
  );
}

const imports = [];
const defaults = [];

if (config.modules && config.modules.indexOf('integration-tests') !== -1) {
  config.modules.forEach((moduleName) => {
    const prefix = `./modules/${moduleName}/tests/integration`;
    glob.sync(`${prefix}/**/*-test.es`).forEach((f) => {
      const filename = f.substring(prefix.length + 1, f.lastIndexOf('.'));
      const defaultExport = createDefaultExportName([
        moduleName,
        ...filename.substring(0, filename.length - 5).split(/[^\w]+/g),
      ]);
      defaults.push(`${defaultExport}();`);
      imports.push(`import ${defaultExport} from './tests/${moduleName}/integration/${filename}';`);
    });
  });
}

module.exports = writeFile('module-integration-tests.es', `
${imports.join('\n')}

TESTS.IntegrationTests = function () {
  describe('integration', function () {
    ${defaults.join('\n    ')}
  });
};
`);
