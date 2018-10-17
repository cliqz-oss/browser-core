import background from '../core/base/background';
import telemetry from '../core/services/telemetry';

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  requiresServices: ['telemetry'],

  /**
    @method init
    @param settings
  */
  init() {

  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    async report(message) {
      await telemetry.push(message, 'metrics.termsAndConditions.duration');
    }
  },
});

