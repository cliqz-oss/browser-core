/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import loggerManager from '../core/logger';
import config from '../core/config';

function stringify(obj) {
  return (typeof obj === 'string') ? obj : JSON.stringify(obj);
}

export default {
  requiresServices: [
    'test-helpers'
  ],

  init() {
    // Send logger messages to TAP, which will forward them to `fern.js`
    if (config.EXTENSION_LOG) {
      this.logChannel = new BroadcastChannel('extlog');
      loggerManager.addObserver((level, ...args) => {
        const stringArgs = args.map(stringify);
        const msg = stringArgs.join(',,, ');
        this.logChannel.postMessage({ level, msg });
      });
    }
  },

  unload() {
    if (this.logChannel) {
      this.logChannel.close();
    }
  }
};
