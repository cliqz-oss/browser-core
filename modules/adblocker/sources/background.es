import CliqzADB from 'adblocker/adblocker';


export default {
  init() {
    if (CliqzADB.getBrowserMajorVersion() < CliqzADB.MIN_BROWSER_VERSION) {
      return;
    }
    CliqzADB.init();
  },

  unload() {
    if (CliqzADB.getBrowserMajorVersion() < CliqzADB.MIN_BROWSER_VERSION) {
      return;
    }
    CliqzADB.unload();
  },
};
