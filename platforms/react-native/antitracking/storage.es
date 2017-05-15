import { AsyncStorage } from 'react-native';

const PREFIX = "@cliqzstorage:";

export default {

  getItem(id) {
    return AsyncStorage.getItem(PREFIX + id);
  },

  setItem(id, value) {
    return AsyncStorage.setItem(PREFIX + id, value);
  },

  removeItem(id) {
    return AsyncStorage.removeItem(PREFIX + id);
  },

  clear() {
    AsyncStorage.clear();
  }
};
