/* global document */
/* eslint no-param-reassign: 'off' */

import console from '../core/console';
import prefs from '../core/prefs';
import config from '../core/config';
import utils from '../core/utils';
import { promiseHttpHandler } from '../core/http';

import { isDesktopBrowser } from '../core/platform';
import { window } from './globals';

const eventIDs = {};
const port = chrome.runtime.connect({ name: 'encrypted-query' });
port.onMessage.addListener((response) => {
  const cb = eventIDs[response.eID].cb;
  delete eventIDs[response.eID];
  if (cb) {
    cb(response.data);
  }
});

const CLIQZEnvironment = {
  SKIN_PATH: 'modules/static/skin/',
  RESULTS_TIMEOUT: 1000, // 1 second
  trk: [],
  telemetry: (() => {
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
    function pushTelemetryCallback(req) {
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
    function pushTelemetryError() {
      // pushTelemetry failed, put data back in queue to be sent again later
      console.log(`push telemetry failed: ${telemetrySending.length} elements`, 'pushTelemetry');
      CLIQZEnvironment.trk = telemetrySending.concat(CLIQZEnvironment.trk);

      // Remove some old entries if too many are stored,
      // to prevent unbounded growth when problems with network.
      const slicePos = (CLIQZEnvironment.trk.length - TELEMETRY_MAX_SIZE) + 100;
      if (slicePos > 0) {
        console.log(`discarding ${slicePos}old telemetry data`, 'pushTelemetry');
        CLIQZEnvironment.trk = CLIQZEnvironment.trk.slice(slicePos);
      }

      telemetrySending = [];
      telemetryReq = null;
    }
    function pushTelemetry() {
      prefs.set('telemetrySeq', telemetrySeq);
      if (telemetryReq) return;
      // put current data aside in case of failure
      telemetrySending = CLIQZEnvironment.trk.slice(0);
      CLIQZEnvironment.trk = [];

      console.log(`push telemetry data: ${telemetrySending.length} elements`, 'pushTelemetry');

      telemetryReq = promiseHttpHandler('POST', config.settings.STATISTICS, JSON.stringify(telemetrySending), 10000, true);
      telemetryReq.then(pushTelemetryCallback);
      telemetryReq.catch(pushTelemetryError);
    }

    return (msg, instantPush) => {
      // no telemetry in private windows & tabs
      if (msg.type !== 'environment' && utils.isPrivateMode()) {
        return;
      }

      console.log(msg, 'Utils.telemetry');
      // telemetry in all products can be turned off using the 'telemetry' pref
      if (!prefs.get('telemetry', true)) return;

      // for desktop browsers we also turn off the extension telemetry
      // if the user opts-out from the browser health report
      if (isDesktopBrowser &&
        msg.type !== 'environment' && // TEMP: we only let the environment signal go though
        (prefs.get('uploadEnabled', true, 'datareporting.healthreport.') !== true)) {
        return;
      }
      // datareporting.healthreport.uploadEnabled
      msg.session = prefs.get('session');
      msg.ts = Date.now();
      msg.seq = getNextSeq();

      CLIQZEnvironment.trk.push(msg);
      clearTimeout(trkTimer);
      if (instantPush || CLIQZEnvironment.trk.length % 100 === 0) {
        pushTelemetry();
      } else {
        trkTimer = setTimeout(pushTelemetry, 60000);
      }
    };
  })(),
  Promise,
  OS: 'chromium',
  isPrivate() { return chrome.extension.inIncognitoContext; },
  isOnPrivateTab() { return chrome.extension.inIncognitoContext; },
  getWindow() { return window; },
  openLink(win, url/* , newTab */) {
    chrome.tabs.getCurrent(tab => chrome.tabs.update(tab.id, {
      url,
    }));
  },
  setSupportInfo() {},
  restoreHiddenSearchEngines() {},
  addEngineWithDetails() {},
  _waitForSearchService() { return Promise.resolve(); },
};

export default CLIQZEnvironment;
