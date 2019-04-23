
export default class Cache {
  constructor(size) {
    this.size = size;
    this.clear();
  }

  clear() {
    this.cache = [];
    for (let i = 0; i < this.size; i += 1) {
      this.cache.push({ key: null, value: null });
    }
  }

  get(key) {
    const val = this.cache[key.length % this.size];

    if (val.key !== key) {
      return undefined;
    }

    return val.value;
  }

  set(key, value) {
    const current = this.cache[key.length % this.size];
    current.key = key;
    current.value = value;
  }
}
