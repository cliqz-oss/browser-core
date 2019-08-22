/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const writeFile = require('broccoli-file-creator');
const glob = require('glob');
const camelCase = require('camelcase');
const config = require('../config');

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
