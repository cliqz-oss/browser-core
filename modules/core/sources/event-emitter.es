import console from './console';
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
   * @param {Array<String>} eventNames - Array of events which can be registered with the emitter
   */
  constructor(eventNames = []) {
    this.events = new Map();
    for (let i = 0; i < eventNames.length; i += 1) {
      this.events.set(eventNames[i], new Map());
    }
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

        nextTick(() => callback(...args)).catch(ex =>
          console.error('Error while emitting event', eventName, callback, args, ex));
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
    if (!this.events.has(eventName)) {
      throw new Error(`${eventName} is not a valid app lifecycle event`, this);
    }

    if (typeof callback !== 'function') {
      return;
    }

    this.events.get(eventName).set(callback, kind);
  }
}
