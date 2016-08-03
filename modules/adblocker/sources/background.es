import { utils, events } from 'core/cliqz';
import CliqzADB from 'adblocker/adblocker';

export default {
  init(settings) {
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
  }
}
