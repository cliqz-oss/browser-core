import { utils } from 'core/cliqz';
import { mkdir } from 'core/fs';
import SmartCliqzCache from 'smart-cliqz-cache/smart-cliqz-cache';
import TriggerUrlCache from 'smart-cliqz-cache/trigger-url-cache';

/**
* @class Background
* @namespace smart-cliqz-cache
*/
export default {
  /**
  * @method init
  */
  init() {
    this.smartCliqzCache = new SmartCliqzCache();
    this.triggerUrlCache = new TriggerUrlCache();

    this.triggerUrlCache.init();
  },
  /**
  * @method unload
  */
  unload() {
    this.smartCliqzCache.unload();
    this.triggerUrlCache.unload();
  },

  beforeBrowserShutdown() {

  }
};
