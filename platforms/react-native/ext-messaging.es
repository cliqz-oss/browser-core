/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NativeModules } from 'react-native';

const Bridge = NativeModules.Bridge;

export default {
  onMessage: {
    addListener() {
      // return chrome.runtime.onMessageExternal.addListener(fn);
    },
    removeListener() {
      // return chrome.runtime.onMessageExternal.removeListener(fn);
    },
  },
  sendMessage(extensionId, message) {
    if (!Bridge || !Bridge.sendExternalMessage) {
      return;
    }
    Bridge.sendExternalMessage(extensionId, message);
  }
};
