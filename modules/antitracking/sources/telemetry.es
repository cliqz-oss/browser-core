import { utils } from 'core/cliqz';

export default {
  telemetry: function(payl) {
    utils.log("No telemetry provider loaded", "attrack");
  },

  msgType: 'humanweb',

  loadFromProvider: function(provider) {
    utils.log("Load telemetry provider: "+ provider, "attrack");
    return System.import(provider).then((mod) => {
      this.telemetry = mod.default.telemetry.bind(mod);
      this.msgType = mod.default.msgType;
      return this;
    });
  }
};
