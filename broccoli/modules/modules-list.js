/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const camelCase = require('camelcase');
const writeFile = require('broccoli-file-creator');
const config = require('../config');

let modulesList = '';

config.modules.forEach((module) => {
  const importStatement = [
    'import',
    `${camelCase(module)}Module`,
    'from',
    `'../../${module}/background';`,
  ].join(' ');
  modulesList += importStatement;
});

modulesList += 'export default {';
config.modules.forEach((module, i) => {
  modulesList += `'${module}': ${camelCase(module)}Module`;
  if (i < config.modules.length - 1) {
    modulesList += ',';
  }
});
modulesList += '};';

module.exports = writeFile('modules.es', modulesList);
