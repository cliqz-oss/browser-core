/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { gitDescribeSync } = require('git-describe');

const {
  configParameter,
  getExtensionVersion,
  setConfigPath,
} = require('../common');

module.exports = (program) => {
  program.command(`version ${configParameter}`)
    .option('--prefix <prefix>', 'replace major version with <prefix>')
    .option('--distance', 'include git distance in version')
    .action((configPath, options) => {
      const cfg = setConfigPath(configPath, options.toSubdir);
      const config = cfg.CONFIG;
      const prefix = options.prefix || config.versionPrefix;
      const distance = options.distance || config.versionDistance;

      getExtensionVersion('package').then((version) => {
        const versionParts = version.split('.');
        if (prefix) {
          versionParts[0] = prefix;
        }

        if (distance) {
          const gitInfo = gitDescribeSync();
          versionParts.push(gitInfo.distance || 0);
        }

        console.log(versionParts.join('.'));
      });
    });

  program.command('addon-version')
    .action(() => {
      getExtensionVersion('package').then(version => console.log(version));
    });
};
