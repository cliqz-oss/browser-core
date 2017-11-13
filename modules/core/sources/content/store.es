import console from '../console';
import store, { unload as unloadStore } from '../../platform/store';
import { nextTick } from '../decorators';

const listeners = new Set();

export default {
  update({ module, data }) {
    store[module] = Object.assign(store[module] || data, data);

    nextTick(() => {
      listeners.forEach((l) => {
        try {
          l(module);
        } catch (e) {
          console.error('Content Store error', e);
        }
      });
    });
  },

  get(path) {
    return store[path];
  },

  addListener(listener) {
    listeners.add(listener);
  },

  removeListener(listener) {
    listeners.delete(listener);
  },

  unload() {
    if (unloadStore) {
      unloadStore();
    }
  },
};
