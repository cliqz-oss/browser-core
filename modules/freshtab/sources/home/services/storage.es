/* global localStorage */

const localStore = {
  setItem(key, value) {
    localStorage.setItem(key, value);
  },
  getItem(key) {
    return localStorage.getItem(key);
  }
};

const dummyStore = {
  setItem() {},
  getItem() {},
};

const getStore = () => {
  try {
    // test if localStorage is available - if so it should not throw
    localStorage.getItem('<whatever>');

    return localStore;
  } catch (e) {
    return dummyStore;
  }
};

export default getStore();
