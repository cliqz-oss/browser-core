/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { setConfigPath } = require('../common');

module.exports = (program) => {
  program.command('addon-id [file]').action((configPath) => {
    const { CONFIG } = setConfigPath(configPath);
    console.log(CONFIG.settings.id || 'cliqz@cliqz.com');
  });
};
