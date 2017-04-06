import { AsyncStorage } from 'react-native';

const PREFIX = "@cliqzstorage:";

export default {

  getItem(id) {
    console.log('storage', 'getItem', id);
    return AsyncStorage.getItem(PREFIX + id);
  },

  setItem(id, value) {
    console.log('storage', 'setItem', id);
    return AsyncStorage.setItem(PREFIX + id, value);
  },

  removeItem(id) {
    console.log('storage', 'removeItem', id);
    return AsyncStorage.removeItem(PREFIX + id);
  },

  clear() {
    AsyncStorage.clear();
  }
};
