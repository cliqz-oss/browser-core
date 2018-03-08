import utils from './utils';

/**
 * @module core
 * @namespace core
 */

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
  constructor(eventNames) {
    /**
     * @property {object} _eventListeners
     */
    this._eventListeners = eventNames.reduce((hash, val) => (
      Object.assign(hash, { [val]: [] })
    ), Object.create(null));
  }

  /**
   * Register to listen to events from this object.
   *
   * @method on
   * @param {String} eventName - Name of the event to listen to
   * @param {Function} callback - Listener function to call when the event is triggered
   */
  on(eventName, callback) {
    if (!(eventName in this._eventListeners)) {
      throw new Error(`${eventName} is not a valid app lifecycle event`);
    }
    this._eventListeners[eventName].push(callback);
  }

  /**
   * Emit an event. Calls all registered listeners to this event on this object
   *
   * @method emit
   * @param {String} eventName - Name of event to emit.
   * @param {Array} args - Arguments to pass to listeners.
   */
  emit(eventName, ...args) {
    this._eventListeners[eventName].forEach(fn => utils.setTimeout(fn.bind(...[null, ...args])), 0);
  }
}
