import getStorage from '../platform/storage';

/**
* @namespace core
*/
export default class Storage {
  constructor(url) {
    // if not called as constructor, still act as one
    if (!(this instanceof Storage)) {
      return new Storage(url);
    }

    this.storage = getStorage.bind(null, url);
    this.url = url;
  }

  getItem(key) {
    try {
      return this.storage().getItem(key);
    } catch (e) {
      // empty
    }
    return undefined;
  }

  setItem(key, value) {
    try {
      return this.storage().setItem(key, value);
    } catch (e) {
      // empty
    }
    return undefined;
  }

  removeItem(key) {
    try {
      return this.storage().removeItem(key);
    } catch (e) {
      // empty
    }
    return undefined;
  }

  clear() {
    try {
      return this.storage().clear();
    } catch (e) {
      // empty
    }
    return undefined;
  }

  /**
   * @method setObject
   * @param key {string}
   * @param object
   */
  setObject(key, object) {
    this.setItem(key, JSON.stringify(object));
  }

  /**
   * @method getObject
   * @param key {string}
   * @param notFound {Boolean}
   */
  getObject(key, notFound = false) {
    const o = this.getItem(key);
    if (o) {
      return JSON.parse(o);
    }
    return notFound;
  }
}
