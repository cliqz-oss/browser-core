/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */

import pacemaker from '../core/services/pacemaker';

/** Set like class whose members are removed after a specific amount of time
*/
export default class TempSet {
  constructor() {
    this._items = new Set();
    this._timeouts = new Set();
  }

  contains(item) {
    return this._items.has(item);
  }

  has(item) {
    return this.contains(item);
  }

  add(item, ttl) {
    this._items.add(item);
    const timeout = pacemaker.setTimeout(function () {
      this.delete(item);
      this._timeouts.delete(timeout);
    }.bind(this), ttl || 0);
    this._timeouts.add(timeout);
  }

  delete(item) {
    this._items.delete(item);
  }

  clear() {
    for (const t of this._timeouts) {
      pacemaker.clearTimeout(t);
    }
    this._timeouts.clear();
    this._items.clear();
  }
}
