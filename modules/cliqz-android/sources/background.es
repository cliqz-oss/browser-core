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
  async init() {
    this.bridge = new Bridge();
    await this.bridge.init();

    const idle = performance.now();
    const libsLoaded = idle;
    this.bridge.callAndroidAction('idle', {
      idle,
      libsLoaded,
    });
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
