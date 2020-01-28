/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { nextTick } from './decorators';

/**
 * @module core
 * @namespace core
 */

const CALLBACK_KIND = {
  ONCE: 0,
  FOREVER: 1,
};

/**
 * Abstract class for classes which want to allow consumers to listen to events
 * from the object.
 *
 * @class EventEmitter
 */
export default class EventEmitter {
  /**
   * @constructor
   */
  constructor() {
    this.events = new Map();
  }

  /**
   * Register to listen to events from this object.
   *
   * @method on
   * @param {String} eventName - Name of the event to listen to
   * @param {Function} callback - Listener function to call when the event is triggered
   */
  on(eventName, callback) {
    this._registerCallback(eventName, callback, CALLBACK_KIND.FOREVER);
  }

  /**
   * Register listener
   *
   * @method off
   * @param {String} eventName - Name of the event to stop listening to
   * @param {Function} callback - Listener function
   */
  off(eventName, callback) {
    return this.unsubscribe(eventName, callback);
  }

  /**
   * Same as `on`, but will only listen to the first event emitted.
   *
   * @method once
   * @param {String} eventName - Name of the event to listen to
   * @param {Function} callback - Listener function to call when the event is triggered
   */
  once(eventName, callback) {
    this._registerCallback(eventName, callback, CALLBACK_KIND.ONCE);
  }

  /**
   * Emit an event. Call all registered listeners to this event on this object.
   *
   * @method emit
   * @param {String} eventName - Name of event to emit.
   * @param {Array} args - Arguments to pass to listeners.
   */
  emit(eventName, ...args) {
    if (this.events.has(eventName)) {
      const eventListeners = this.events.get(eventName);
      [...eventListeners.entries()].forEach(([callback, kind]) => {
        // Remove one-shot listeners
        if (kind === CALLBACK_KIND.ONCE) {
          eventListeners.delete(callback);
        }

        nextTick(() => callback(...args));
      });
    }
  }

  unsubscribe(eventName, callback) {
    if (typeof callback !== 'function') {
      return;
    }

    if (this.events.has(eventName)) {
      this.events.get(eventName).delete(callback);
    }
  }

  _registerCallback(eventName, callback, kind) {
    if (typeof callback !== 'function') {
      return;
    }

    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Map());
    }

    this.events.get(eventName).set(callback, kind);
  }
}
