import { utils } from 'core/cliqz';
import { mkdir } from 'core/fs';
import SmartCliqzCache from 'smart-cliqz-cache/smart-cliqz-cache';
import TriggerUrlCache from 'smart-cliqz-cache/trigger-url-cache';

export default {
  init() {
    this.smartCliqzCache = new SmartCliqzCache();
    this.triggerUrlCache = new TriggerUrlCache();

    this.triggerUrlCache.init();
  },

  unload() {
    this.smartCliqzCache.unload();
    this.triggerUrlCache.unload();
  },

  beforeBrowserShutdown() {

  }
};
