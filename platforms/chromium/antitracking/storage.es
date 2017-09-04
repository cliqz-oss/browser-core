import KeyValueStore from '../kv-store';


export default {
  getItem(key) {
    return KeyValueStore.get(key).catch(() => null);
  },
  setItem(key, value) {
    return KeyValueStore.set(key, value);
  },
  removeItem(key) {
    return KeyValueStore.remove(key);
  },
};
