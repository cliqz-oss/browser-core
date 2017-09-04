const storage = new Map();

class Storage {
  getItem(key) {
    return storage.get(key);
  }

  setItem(key, value) {
    storage.set(key, value);
  }

  hasItem(hey) {
    storage.has(key)
  }

  clear() {

  }
}


export default function (url) {
  return new Storage();
  //throw new Error('LocalStorage not supported');
}
