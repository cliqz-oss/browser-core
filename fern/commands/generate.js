/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { lstatSync } = require('fs');
const { resolve, join } = require('path');

const TreeSync = require('tree-sync');
const glob = require('glob');

function directoryExists(path) {
  try {
    // lstatSync throws error if Directory does not exist, which is
    // the only situation that generator can work.
    lstatSync(path);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = (program) => {
  program
    .command('generate <type> <moduleName>')
    .description('available types: module')
    .action((type, moduleName) => {
      if (type !== 'module') {
        console.error(`Error: generate does not support type - '${type}'`);
        return;
      }

      const modulePath = resolve(join(process.cwd(), 'modules', moduleName));
      if (directoryExists(modulePath)) {
        console.error('module already exists', modulePath);
      } else {
        console.log('creating new module', modulePath);
        const templatePath = resolve(join(process.cwd(), 'fern', 'templates', 'module'));
        (new TreeSync(templatePath, modulePath)).sync();
        glob.sync(`${modulePath}/**/*`).forEach(p => console.log('+ created', p));
      }
    });
};
