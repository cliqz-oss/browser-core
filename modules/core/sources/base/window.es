/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { subscribe } from '../events';

export default class AppWindow {
  constructor({ windowId, window }) {
    this.windowId = windowId;
    this.window = window;
    this.eventHandlers = new Set();
  }

  init() {
    /*
     * wrap all event handlers into a check that verify
     * if we have a correct window
     */
    Object.keys(this.events).forEach((eventName) => {
      const handler = subscribe(eventName, (...args) => {
        if ((typeof args[0] !== 'object') || (args[0].windowId !== this.windowId)) {
          return;
        }

        this.events[eventName].call(this, ...args);
      });
      this.eventHandlers.add(handler);
    });
  }

  unload() {
    for (const handler of this.eventHandlers) {
      handler.unsubscribe();
      this.eventHandlers.delete(handler);
    }
  }
}
