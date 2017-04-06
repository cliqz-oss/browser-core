import CliqzUtils from 'core/utils';

/** Set like class whose members are removed after a specifie
*/
export default class {

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
    var timeout = CliqzUtils.setTimeout(function() {
        this.delete(item);
        this._timeouts.delete(timeout);
    }.bind(this), ttl || 0);
    this._timeouts.add(timeout);
  }

  delete(item) {
    this._items.delete(item);
  }

  clear() {
    for (let t of this._timeouts) {
      CliqzUtils.clearTimeout(t);
    }
    this._timeouts.clear();
    this._items.clear();
  }

};
