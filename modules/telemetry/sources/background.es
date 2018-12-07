import background from '../core/base/background';
import utils from '../core/utils';
import inject from '../core/kord/inject';
import prefs from '../core/prefs';
import console from '../core/console';
import config from '../core/config';
import { promiseHttpHandler } from '../core/http';
import { isOnionMode } from '../core/platform';

/* eslint-disable no-param-reassign */
const createTelemetry = (bg) => {
  let trkTimer = null;
  let telemetrySeq = -1;
  let telemetryReq = null;
  let telemetrySending = [];
  const TELEMETRY_MAX_SIZE = 500;

  function getNextSeq() {
    if (telemetrySeq === -1) {
      telemetrySeq = prefs.get('telemetrySeq', 0);
    }
    telemetrySeq = (telemetrySeq + 1) % 2147483647;
    return telemetrySeq;
  }

  function _pushTelemetryCallback(req) {
    try {
      const response = JSON.parse(req.response);

      if (response.new_session) {
        prefs.set('session', response.new_session);
      }
      telemetrySending = [];
      telemetryReq = null;
    } catch (e) {
      // this can only happen if the callback is called
      // after the extension is turned off
    }
  }

  function _pushTelemetryError() {
    // pushTelemetry failed, put data back in queue to be sent again later
    console.log(`push telemetry failed: ${telemetrySending.length} elements`, 'pushTelemetry');
    bg.trk = telemetrySending.concat(bg.trk);

    // Remove some old entries if too many are stored,
    // to prevent unbounded growth when problems with network.
    const slicePos = (bg.trk.length - TELEMETRY_MAX_SIZE) + 100;
    if (slicePos > 0) {
      console.log(`discarding ${slicePos}old telemetry data`, 'pushTelemetry');
      bg.trk = bg.trk.slice(slicePos);
    }

    telemetrySending = [];
    telemetryReq = null;
  }

  function pushTelemetry() {
    prefs.set('telemetrySeq', telemetrySeq);
    if (telemetryReq) return;
    // put current data aside in case of failure
    telemetrySending = bg.trk.slice(0);
    bg.trk = [];

    console.log(`push telemetry data: ${telemetrySending.length} elements`, 'pushTelemetry');

    telemetryReq = promiseHttpHandler('POST', config.settings.STATISTICS, JSON.stringify(telemetrySending), 10000, true);
    telemetryReq.then(_pushTelemetryCallback);
    telemetryReq.catch(_pushTelemetryError);
  }

  return (msg, instantPush) => {
    // no telemetry in private windows & tabs
    if (msg.type !== 'environment' && utils.isPrivateMode()) {
      return;
    }

    if (isOnionMode) {
      return;
    }

    console.log(msg, 'Utils.telemetry');
    if (msg.type !== 'environment' && !inject.service('telemetry').isEnabled()) {
      return;
    }

    // datareporting.healthreport.uploadEnabled
    bg.trk.push({
      session: prefs.get('session'),
      ts: Date.now(),
      seq: getNextSeq(),
      ...msg,
    });
    clearTimeout(trkTimer);
    if (instantPush || bg.trk.length % 100 === 0) {
      pushTelemetry();
    } else {
      trkTimer = setTimeout(pushTelemetry, 60000);
    }
  };
};
/* eslint-enable no-param-reassign */

export default background({
  init() {
    this.trk = [];
    this.telemetry = createTelemetry(this);
    const index = utils.telemetryHandlers.indexOf(this.telemetry);
    if (index === -1) {
      utils.telemetryHandlers.push(this.telemetry);
    }
  },

  unload() {
    const index = utils.telemetryHandlers.indexOf(this.telemetry);
    if (index !== -1) {
      utils.telemetryHandlers.splice(index, 1);
    }
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  },
});
