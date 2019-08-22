/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import runtime from './runtime';

export default {
  onMessage: {
    addListener(fn) {
      return runtime.onMessageExternal.addListener(fn);
    },
    removeListener(fn) {
      return runtime.onMessageExternal.removeListener(fn);
    },
  },
  sendMessage(extensionId, message) {
    return runtime.sendMessage(extensionId, message).catch(() => undefined);
  }
};
