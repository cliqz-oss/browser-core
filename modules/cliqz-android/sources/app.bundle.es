/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import App from '../core/app';

const CLIQZ = {};
CLIQZ.app = new App({});
CLIQZ.app.start();
window.CLIQZ = CLIQZ;

window.addEventListener('unload', () => {
  CLIQZ.app.stop();
});
