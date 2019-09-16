/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// TODO: use in TabObserver and others
import { setTimeout } from '../timers';

export default base => class extends base {
  constructor() {
    super();
    this.eventListeners = {};
  }

  addEventListener(eventName, handler) {
    this.eventListeners[eventName] = this.eventListeners[eventName] || [];
    this.eventListeners[eventName].push(handler);
  }

  removeEventListener(eventName, handler) {
    const eventListeners = this.eventListeners[eventName] || [];
    const index = eventListeners.indexOf(handler);

    this.eventListeners[eventName] = eventListeners;

    if (index >= 0) {
      eventListeners.splice(index, 1);
    }
  }

  publishEvent(eventName, ...args) {
    const eventListeners = this.eventListeners[eventName] || [];
    eventListeners.forEach((handler) => {
      setTimeout(handler, 0, ...args);
    });
  }
};
