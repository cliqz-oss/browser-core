import getStorage from 'platform/storage';

/**
* @namespace core
*/
export default class Storage {

  constructor(url) {
    // if not called as constructor, still act as one
    if (!(this instanceof Storage)) {
      return new Storage(url);
    }

    this.storage = getStorage(url);
    // just proxy to storage
    this.getItem = this.storage.getItem.bind(this.storage);
    this.setItem = this.storage.setItem.bind(this.storage);
    this.removeItem = this.storage.removeItem.bind(this.storage);
    this.clear = this.storage.clear.bind(this.storage);
  }

  /**
   * @method setObject
   * @param key {string}
   * @param object
   */
  setObject(key, object) {
    this.storage.setItem(key, JSON.stringify(object));
  }

  /**
   * @method getObject
   * @param key {string}
   * @param notFound {Boolean}
   */
  getObject(key, notFound = false) {
    const o = this.storage.getItem(key);
    if (o) {
      return JSON.parse(o);
    }
    return notFound;
  }
}
