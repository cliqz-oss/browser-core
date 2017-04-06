import CliqzHM from 'hm/main';
import CliqzUtils from 'core/utils';

export default {
  init() {
    const histSearchType = CliqzUtils.getPref('hist_search_type', 0);
    if (histSearchType !== 0) {
      CliqzUtils.log(`Initializing CliqzHM ${histSearchType} CliqzHM`);
      CliqzHM.init();
      CliqzUtils.hm = CliqzHM;
    } else {
      CliqzUtils.hm = null;
    }
  },

  unload() {
    if (CliqzUtils.hm) {
      CliqzUtils.hm.unload();
    }
  },
};
