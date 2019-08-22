/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const fs = require('fs');
const writeFile = require('broccoli-file-creator');
const config = require('../config');

let fileContents = '';
if (config.modules) {
  config.modules.forEach((moduleName) => {
    if (fs.existsSync(`modules/${moduleName}/tests/content-tests.es`)) {
      fileContents += `import './tests/${moduleName}/content-tests';\n`;
    }
  });
}

module.exports = writeFile('module-content-tests.es', fileContents);
