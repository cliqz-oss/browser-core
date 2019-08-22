/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const writeFile = require('broccoli-file-creator');
const config = require('./config');

let fileContents = '';

if (config.react_components) {
  const importStatements = Object.keys(config.react_components).map((componentName) => {
    const componentPath = config.react_components[componentName];
    return `import ${componentName} from '${componentPath}';`;
  }).join('\n');
  const componentList = Object.keys(config.react_components).join(', ');

  fileContents += importStatements;
  fileContents += '\n';
  fileContents += `export default { ${componentList} };`;
} else {
  fileContents = 'export default { }';
}

module.exports = writeFile('components.js', fileContents);
