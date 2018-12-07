import background from '../core/base/background';
import inject from '../core/kord/inject';

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
      await inject.service('telemetry').push(message, 'metrics.termsAndConditions.duration');
    }
  },
});
