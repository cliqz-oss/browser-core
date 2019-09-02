/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import console from './console';

/* eslint-disable import/prefer-default-export, import/no-dynamic-require, global-require */
export function chromeUrlHandler(url, callback, onerror) {
  const path = url.replace('chrome://', '');
  try {
    const response = JSON.stringify(require(`../${path}`));
    callback({
      status: 200,
      response,
    });
  } catch (e) {
    console.log('chromeUrlHandler: not bundled', path, e);
    onerror();
  }
}
/* eslint-enable import/prefer-default-export, import/no-dynamic-require, global-require */
