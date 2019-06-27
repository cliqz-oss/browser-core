import background from '../core/base/background';
import ABTests from './ab-tests';

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  requiresServices: ['session', 'telemetry', 'pacemaker'],
  /**
    @method init
    @param settings
  */
  init() {
    this.loadingAbtestPromise = ABTests.check();
    ABTests.start();
  },

  unload() {
    ABTests.stop();
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    getRunningTests() {
      const current = ABTests.getCurrent();
      if (current) {
        return current;
      }
      return this.loadingAbtestPromise;
    },
  },
});
