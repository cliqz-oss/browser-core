import background from '../core/base/background';
import Bridge from './native-bridge';

/**
  @namespace cliqz-android
  @module cliqz-android
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {
    this.bridge = new Bridge();
    return this.bridge.init();
  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    getInstallDate() {
      return this.bridge.callAndroidAction('getInstallDate');
    }
  },
});
