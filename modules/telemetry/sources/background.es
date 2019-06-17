import background from '../core/base/background';
import inject from '../core/kord/inject';
import prefs, { getCliqzPrefs } from '../core/prefs';
import console from '../core/console';
import config from '../core/config';
import { promiseHttpHandler } from '../core/http';
import { getDaysSinceInstall } from '../core/demographics';
import pacemaker from '../core/services/pacemaker';
import History from '../platform/history/history';
import { isDefaultBrowser } from '../platform/browser';
import { getDefaultSearchEngine } from '../core/search-engines';

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
        bg.sessionService.saveSession(response.new_session);
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
    console.log(msg, 'Utils.telemetry');

    bg.trk.push({
      session: bg.sessionService.getSession(),
      ts: Date.now(),
      seq: getNextSeq(),
      ...msg,
    });

    pacemaker.clearTimeout(trkTimer);
    trkTimer = null;

    if (instantPush || bg.trk.length % 100 === 0) {
      pushTelemetry();
    } else {
      trkTimer = pacemaker.setTimeout(pushTelemetry, 60000);
    }
  };
};
/* eslint-enable no-param-reassign */

export default background({
  requiresServices: ['cliqz-config', 'telemetry', 'session', 'pacemaker'],
  telemetryService: inject.service('telemetry', ['installProvider', 'uninstallProvider', 'push', 'isBrowserTelemetryEnabled']),
  sessionService: inject.service('session', ['getSession', 'saveSession']),

  init() {
    this.trk = [];

    // Instantiate legacy telemetry manager. It is stored in the closure only to
    // not be accessible from outside. Any user of telemetry should go through
    // telemetry service and not use providers directly.
    const telemetry = createTelemetry(this);

    this.telemetryProvider = {
      name: 'telemetry',
      send: (message, schema, instant) => {
        if (schema) {
          return Promise.resolve();
        }
        return telemetry(message, instant);
      },
    };
    this.telemetryService.installProvider(this.telemetryProvider);

    const sendEnvironmentalSignal = async ({ startup, instantPush }) => {
      const info = {
        type: 'environment',
        agent: navigator.userAgent,
        language: navigator.language,
        version: inject.app.version,
        startup,
        prefs: getCliqzPrefs(),
        defaultSearchEngine: (getDefaultSearchEngine() || {}).name,
        isDefaultBrowser: await isDefaultBrowser(),
        distribution: prefs.get('distribution', '', 'extensions.cliqz.'),
        version_host: prefs.get('gecko.mstone', '', ''),
        version_dist: prefs.get('distribution.version', '', ''),
        health_report_enabled: this.telemetryService.isBrowserTelemetryEnabled(),
      };

      // This signal is always sent as an "alive signal" and thus does not go
      // through telemetry service.
      telemetry(info, instantPush);

      let historyStats = {};
      try {
        historyStats = await History.stats();
      } catch (e) {
        // on android history stats are not available
      }
      // Not sent in case of opt-out. Sent through telemetry service which
      // checks for opt-out from user.
      this.telemetryService.push({
        type: 'environment.extended',
        history_days: historyStats.days,
        history_urls: historyStats.size,
        install_date: await getDaysSinceInstall(),
      });
    };

    sendEnvironmentalSignal({ startup: true, instantPush: true });
    this.whoAmItimer = pacemaker.everyHour(
      sendEnvironmentalSignal.bind(null, { startup: false }),
    );
  },

  unload() {
    this.telemetryService.uninstallProvider(this.telemetryProvider);

    if (this.whoAmItimer !== null) {
      this.whoAmItimer.stop();
      this.whoAmItimer = null;
    }
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    getTrk() {
      return JSON.parse(JSON.stringify(this.trk));
    },
  },
});
