import console from '../console';
import store from '../../platform/store';

const listeners = new Set();

export default {
  update({ module, data }) {
    store[module] = Object.assign(store[module] || data, data);

    Promise.resolve().then(() => {
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
};
