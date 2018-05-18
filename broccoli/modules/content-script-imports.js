'use strict';
var fs = require('fs');
const writeFile = require('broccoli-file-creator');
const config = require('../config');

let fileContents = '';
if (config.modules) {
  config.modules.forEach((moduleName) => {
    if (moduleName === 'core') return;
    if (fs.existsSync(`modules/${moduleName}/sources/content.es`)) {
      fileContents += `import './${moduleName}/content';\n`;
    }
  })
}

module.exports = writeFile('module-content-script.es', fileContents);
