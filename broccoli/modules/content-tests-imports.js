'use strict';
var fs = require('fs');
const writeFile = require('broccoli-file-creator');
const config = require('../config');

let fileContents = '';
if (config.modules) {
  config.modules.forEach((moduleName) => {
    if (fs.existsSync(`modules/${moduleName}/tests/content-tests.es`)) {
      fileContents += `import './tests/${moduleName}/content-tests';\n`;
    }
  })
}

module.exports = writeFile('module-content-tests.es', fileContents);
