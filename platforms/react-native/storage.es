import { AsyncStorage } from 'react-native';

class LocalStorage {
  static get STATIC_PREFIX() {
    return '_CLRNLS_';
  }

  constructor(prefix = '') {
    this.data = new Map();
    this.prefix = JSON.stringify([LocalStorage.STATIC_PREFIX, prefix]);
    this.isLoaded = false;
  }

  load() {
    this.isLoaded = true;
    return AsyncStorage.getAllKeys().then((keys) => {
      const prefKeys = keys.filter(k => k.indexOf(this.prefix) === 0);
      return AsyncStorage.multiGet(prefKeys).then((result) => {
        if (!result) {
          return;
        }
        result.forEach((prefPair) => {
          this.data.set(prefPair[0].substring(this.prefix.length), prefPair[1]);
        });
      });
    });
  }

  setItem(key, value) {
    this.data.set(key, value);
    if (this.isLoaded) {
      AsyncStorage.setItem(`${this.prefix}${key}`, value);
    }
  }

  getItem(key) {
    return this.data.get(key);
  }

  removeItem(key) {
    this.data.delete(key);
    if (this.isLoaded) {
      AsyncStorage.removeItem(`${this.prefix}${key}`);
    }
  }

  clear() {
    if (this.isLoaded) {
      const keys = [...this.data.keys()].map(key => `${this.prefix}${key}`);
      AsyncStorage.multiRemove(keys);
    }
    this.data.clear();
  }
}

export default function (url) {
  return new LocalStorage(url);
}
