/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const writeFile = require('broccoli-file-creator');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const config = require('./config');
const modules = require('./modules-tree');

let fileContents = '';

if (config.resources && config.resources.bundling === 'require') {
  const pathVariable = path => path.replace('/', '_').replace('.', '_').replace('-', '_');
  const assets = config.resources.include.map(path => ({ varName: pathVariable(path), resourcePath: path }));
  const importStatements = assets.map((args) => {
    const varName = args.varName;
    const resourceName = args.resourcePath;
    const resourcePath = `./modules/${resourceName}`;
    return `import ${varName} from '${resourcePath}';`;
  }).join('\n');
  const resourcesList = assets.map((args) => {
    const varName = args.varName;
    const resourceName = args.resourcePath;
    return `'${resourceName}': ${varName}`;
  }).join(',\n');

  fileContents += importStatements;
  fileContents += '\n';
  fileContents += `export default { ${resourcesList} \n};\n`;

  module.exports = writeFile('resources.js', fileContents);
} else if (config.resources && config.resources.bundling === 'assets') {
  fileContents = 'import assetLoader from \'./modules/platform/asset-loader\'\n';
  fileContents += 'export default assetLoader';

  const assetsTree = new Funnel(modules.static, {
    destDir: 'assets',
    include: config.resources.include,
  });
  module.exports = new MergeTrees([assetsTree, writeFile('resources.js', fileContents)]);
} else {
  fileContents = 'export default { }';
  module.exports = writeFile('resources.js', fileContents);
}
