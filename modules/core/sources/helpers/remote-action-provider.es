/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import runtime from '../../platform/runtime';

/**
 * Abstract away exposing actions triggered through `sendMessage`. This is done
 * in `navigation-extension` in different contexts: content scripts, popup
 * windows, etc.
 */
export default class RemoteActionProvider {
  constructor(module, actions) {
    this.onMessage = (message) => {
      if (message.module === module) {
        const handler = actions[message.action];
        if (handler !== undefined) {
          // Prepare array of arguments which will be given to `handler`
          let args = message.args || [];

          // Backward compatible "hack" since some users of this API still
          // provide a unique argument in the form of `{ message }`. If we
          // detect this scenario then we use it as argument for `handler`.
          if (message.message !== undefined) {
            args = [message.message];
          }

          return Promise.resolve(handler(...args));
        }
      }

      return undefined; // not handled by us
    };
  }

  init() {
    runtime.onMessage.addListener(this.onMessage);
  }

  unload() {
    runtime.onMessage.removeListener(this.onMessage);
  }
}
