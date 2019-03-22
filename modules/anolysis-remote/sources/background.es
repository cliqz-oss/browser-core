import background from '../core/base/background';
import inject from '../core/kord/inject';
import config from '../core/config';
import extMessaging from '../platform/ext-messaging';

function sendTelemetry(signal, schema, instant) {
  extMessaging.sendMessage(config.settings.telemetryExtensionId, {
    moduleName: 'core',
    action: 'sendTelemetry',
    args: [signal, instant, schema],
  });
}

/**
  @namespace anolysis-remote
  @class Background
 */
export default background({
  requiresServices: ['telemetry'],
  telemetryService: inject.service('telemetry', ['installProvider', 'uninstallProvider']),

  /**
    @method init
    @param settings
  */
  init(settings) {
    this.telemetryProvider = {
      name: 'anolysis-remote',
      send: sendTelemetry,
    };
    if (settings.telemetryExtensionId) {
      this.telemetryService.installProvider(this.telemetryProvider);
    }
  },

  unload() {
    if (this.telemetryExtensionId) {
      this.telemetryService.uninstallProvider(this.telemetryProvider);
    }
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  },
});
