import background from '../core/base/background';
import utils from '../core/utils';
import telemetry, { sendTelemetry } from './services/telemetry';

/**
  @namespace anolysis-remote
  @class Background
 */
export default background({
  providesServices: {
    telemetry,
  },

  /**
    @method init
    @param settings
  */
  init(settings) {
    if (settings.telemetryExtensionId) {
      utils.telemetryHandlers.push(sendTelemetry);
    }
  },

  unload() {
    if (this.telemetryExtensionId) {
      const index = utils.telemetryHandlers.indexOf(sendTelemetry);
      if (index !== -1) {
        utils.telemetryHandlers.splice(index, 1);
      }
    }
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  },
});
