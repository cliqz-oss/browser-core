import background from '../core/base/background';
import Bridge from './native-bridge';
import { load as loadMathjs } from '../platform/lib/mathjs';

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

    window.requestIdleCallback(async () => {
      const idle = performance.now();

      await loadMathjs();

      const libsLoaded = performance.now();
      this.bridge.callAndroidAction('idle', {
        idle,
        libsLoaded,
      });
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
