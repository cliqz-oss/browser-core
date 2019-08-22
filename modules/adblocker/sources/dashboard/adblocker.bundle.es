/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import checkIfChromeReady from '../../core/content/ready-promise';
import createModuleWrapper from '../../core/helpers/action-module-wrapper';
import siteBuilder from './app';

checkIfChromeReady().then(() => {
  siteBuilder(createModuleWrapper('adblocker'));
}).catch((ex) => {
  // eslint-disable-next-line no-console
  console.error('Chrome was never ready', ex);
});
