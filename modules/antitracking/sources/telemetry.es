import { utils } from '../core/cliqz';
import platformTelemetry from '../platform/telemetry';
import inject from '../core/kord/inject';

export default {
  telemetry: function(payl) {
    if (!this.provider) {
      utils.log("No telemetry provider loaded", "attrack");
      return;
    }

    return this.provider.action('telemetry', payl);
  },

  provider: null,
  msgType: 'humanweb',

  loadFromProvider: function(provider) {
    utils.log("Load telemetry provider: "+ provider, "attrack");
    if (provider === 'platform') {
      this.telemetry = platformTelemetry.telemetry.bind(platformTelemetry);
      this.msgType = platformTelemetry.msgType;
      return Promise.resolve(this);
    } else {
      this.provider = inject.module(provider);
    }
  }
};
