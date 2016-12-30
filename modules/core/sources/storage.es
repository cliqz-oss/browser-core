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

    this.storage = getStorage.bind(null, url);
    this.url = url;
  }

  getItem(key) {
    return this.storage().getItem(key);
  }

  setItem(key, value) {
    return this.storage().setItem(key, value);
  }

  removeItem(key) {
    return this.storage().removeItem(key);
  }

  clear() {
    return this.storage().clear();
  }

  /**
   * @method setObject
   * @param key {string}
   * @param object
   */
  setObject(key, object) {
    this.storage().setItem(key, JSON.stringify(object));
  }

  /**
   * @method getObject
   * @param key {string}
   * @param notFound {Boolean}
   */
  getObject(key, notFound = false) {
    const o = this.storage().getItem(key);
    if (o) {
      return JSON.parse(o);
    }
    return notFound;
  }
}
