/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const path = require('path');
const spawn = require('cross-spawn');
const { setConfigPath } = require('../common');

module.exports = (program) => {
  program
    .command('react-dev [config]')
    .description('run the react-native dev server')
    .action((config) => {
      const cfg = setConfigPath(config || 'configs/react-native.js');
      const OUTPUT_PATH = cfg.OUTPUT_PATH;
      const projectRoots = [OUTPUT_PATH, path.resolve(process.cwd(), 'node_modules')];
      const options = [
        './node_modules/react-native/local-cli/cli.js',
        'start',
        '--projectRoots',
        projectRoots.join(','),
      ];
      spawn.sync('node', options, { stdio: 'inherit', stderr: 'inherit' });
    });
};
