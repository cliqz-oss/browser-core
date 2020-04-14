/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const {
  configParameter,
  getExtensionVersion,
  setConfigPath,
} = require('../common');

module.exports = (program) => {
  program.command(`version ${configParameter}`)
    .action(async (configPath, options) => {
      const cfg = setConfigPath(configPath, options.toSubdir);
      const config = cfg.CONFIG;

      const version = await getExtensionVersion('package', config);
      console.log(version);
    });

  program.command('addon-version')
    .action(() => {
      getExtensionVersion('package').then(version => console.log(version));
    });
};
