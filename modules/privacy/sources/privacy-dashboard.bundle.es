/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import checkIfChromeReady from '../core/content/ready-promise';
import siteBuilder from './dashboard/app';
import createModuleWrapper from '../core/helpers/action-module-wrapper';

// main entry point
checkIfChromeReady().then(() => {
  siteBuilder(createModuleWrapper('privacy'));
}).catch((ex) => {
  // eslint-disable-next-line no-console
  console.error('Chrome was never ready', ex);
});
