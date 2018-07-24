
/**
 * The real AsyncStorage API only accept strings as key/value, so we use this to
 * stick to the behavior as closely as possible.
 */
function assertIsString(value) {
  if (typeof value !== 'string') {
    throw new Error(`AsyncStorage expected a string, got: ${value}`);
  }
}

/**
 * This class implements an in-memory AsyncStorage API.
 */
class AsyncStorage {
  constructor() {
    this.storage = new Map();
  }

  async getItem(key) {
    assertIsString(key);
    return this.storage.get(key);
  }

  async setItem(key, value) {
    assertIsString(key);
    assertIsString(value);
    this.storage.set(key, value);
  }

  async removeItem(key) {
    assertIsString(key);
    this.storage.delete(key);
  }

  async mergeItem(key, value) {
    assertIsString(key);
    assertIsString(value);
    if (!this.storage.has(key)) {
      return this.setItem(key, value);
    }

    return this.setItem(key, JSON.stringify({
      ...JSON.parse(this.storage.get(key)),
      ...JSON.parse(value),
    }));
  }

  async clear() {
    this.storage = new Map();
  }

  async getAllKeys() {
    return [...this.storage.keys()];
  }

  async flushGetRequests() { /* Not Implemented */ }

  async multiGet(keys) {
    keys.forEach(assertIsString);
    return keys.map(k => [k, this.storage.get(k)]);
  }

  async multiSet(items) {
    for (let i = 0; i < items.length; i += 1) {
      const [key, value] = items[i];
      assertIsString(key);
      assertIsString(value);
      this.storage.set(key, value);
    }
  }

  async multiRemove(keys) {
    keys.forEach(assertIsString);
    keys.forEach(k => this.storage.delete(k));
  }

  async multiMerge() { /* Not Implemented */ }
}

export default new AsyncStorage();
