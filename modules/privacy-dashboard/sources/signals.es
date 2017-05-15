'use strict';

/*
 * Functions to handle collecting to selecting / preparing signals for the dashboard
 */

import { utils, events } from 'core/cliqz';
import environment from 'platform/environment';
import CliqzHumanWeb from 'human-web/human-web';

let streamMode = false;

function local(key) {
  return utils.getLocalizedString(key);
}

function lastElementArray(arr) {
  const tmp = arr || [];
  return tmp.length > 0 ? tmp[tmp.length - 1] : null;
}

function reformatSignalsFlat(sig, ignoreKeys = [], send = 'allowed') {
  const info = [];
  Object.keys(sig || []).forEach((name) => {
    if (ignoreKeys.indexOf(name) === -1 && (sig[name] !== null)) {
      info.push({
        name,
        val: (sig[name] && typeof (sig[name]) === 'object' ? JSON.stringify(sig[name]) : sig[name] || '').toString(),
        send,
        des: ''  // todo: fill in descriptions
      });
    }
  });
  return info;
}

const QUERY_LOG_PARAM = {
  q: 'query',
  a: 'queryAutocompleted',
  i: 'resultIndex',
  u: 'resultUrl',
  o: 'resultOrder',
  e: 'extra',
  s: 'searchSession',
  n: 'sessionSequence',
  qc: 'queryCount'
};

const SignalListener = {
  telemetryOrigin: utils.telemetry,
  httpGetOrigin: utils.httpGet, // used for fetching result and query log telemetry
  hwOrigin: CliqzHumanWeb.telemetry,  // todo: handle the case hw is inited AFTER this module

  SigCache: {
    hw: { sig: null, timestamp: 0 },
    tel: { sig: [], timestamp: 0 },
    ql: { sig: null, timestamp: 0 }
  },

  // telSigAggregatePeriod: 10, // miliseconds, telemetry signal will be
  // aggregate within this window (non-everlap)

  fireNewDataEvent(sigType) {
    if (streamMode === true) {
      events.pub('PRIVACY_DASHBOARD_NEWDATA', sigType);
    }
  },

  monkeyPatchHmw() {
    SignalListener.hwOrigin.apply(this, arguments);
    SignalListener.SigCache.hw = {
      sig: lastElementArray(CliqzHumanWeb.trk),
      timestamp: Date.now()
    };
    SignalListener.fireNewDataEvent('hw');
  },

  monkeyPatchTelemetry() {
    SignalListener.telemetryOrigin.apply(this, arguments);

    // aggregate data within the predefined aggregation window
    // To use ONLY the LAST SIGNAL, use this line below instead of the if block,
    // OR set SignalListener.telSigAggregatePeriod = 0

    SignalListener.SigCache.tel = {
      sig: [lastElementArray(environment.trk)],
      timestamp: Date.now()
    };
    /*
    var timeNow = Date.now();
    if (timeNow - SignalListener.SigCache.tel.timestamp < SignalListener.telSigAggregatePeriod) {
      SignalListener.SigCache.tel.sig.push(lastElementArray(environment.trk));
    } else {
      SignalListener.SigCache.tel.sig = [lastElementArray(environment.trk)];
      SignalListener.SigCache.tel.timestamp = timeNow;
    }
    */

    SignalListener.fireNewDataEvent('tel');
  },

  monkeyPatchHttpGet() {
    setTimeout((url) => {
      const queryLog = {};
      if (url.startsWith(utils.RESULTS_PROVIDER) || url.startsWith(utils.RESULTS_PROVIDER_LOG)) {
        const qs = utils.getDetailsFromUrl(url).query;
        const qsParams = utils.parseQueryString(qs);
        Object.keys(qsParams).forEach((key) => {
          if (qsParams[key]) {
            queryLog[QUERY_LOG_PARAM[key] || key] = qsParams[key];
          }
        });

        SignalListener.SigCache.ql = { sig: queryLog, timestamp: Date.now() };
        SignalListener.fireNewDataEvent('ql');
      }
    }, 0, arguments[0]);

    return SignalListener.httpGetOrigin.apply(this, arguments);
  },

  init() {
    if (!(SignalListener.monkeyPatchTelemetry
          && SignalListener.monkeyPatchHttpGet && SignalListener.monkeyPatchHmw)) {
      SignalListener.telemetryOrigin = utils.telemetry;
      SignalListener.httpGetOrigin = utils.httpGet;
      SignalListener.hwOrigin = CliqzHumanWeb.telemetry;
    }
    if (SignalListener.monkeyPatchTelemetry
          && SignalListener.monkeyPatchHttpGet && SignalListener.monkeyPatchHmw) {
      utils.telemetry = SignalListener.monkeyPatchTelemetry;
      utils.httpGet = SignalListener.monkeyPatchHttpGet;
      CliqzHumanWeb.telemetry = SignalListener.monkeyPatchHmw;

      // if Signals only start listens only when someone open the dashboard
      // -> there'll be no data to be shown
      // to avoid disappointment from the users, we will show the last telemetry signal
      // and the last Humanweb signal
      // stored in the queue (if any)

      // this should be the signal user clicking the privacy dashboard button
      SignalListener.SigCache.tel = {
        sig: [lastElementArray(environment.trk)],
        timestamp: Date.now()
      };
      // last human web signal
      SignalListener.SigCache.hw = {
        sig: lastElementArray(CliqzHumanWeb.trk),
        timestamp: Date.now()
      };
      return true;
    }
    return false;
  },

  stopListen() {
    if (SignalListener.telemetryOrigin) {
      utils.telemetry = SignalListener.telemetryOrigin;
    }
    if (SignalListener.httpGetOrigin) {
      utils.httpGet = SignalListener.httpGetOrigin;
    }
    if (SignalListener.hwOrigin) {
      CliqzHumanWeb.telemetry = SignalListener.hwOrigin;
    }
  }
};


const HumanwebSignal = {
  dataKey: 'payload',
  dataSubKey: ['c', 'r', 'e', 'x', 'red'],
  dataSubKeyDes: {
    r: local('signals-search-results'),
    c: local('signals-visited-page'),
    e: local('signals-count-action'),
    x: local('signals-page-info'),
    red: local('signals-redirected-links')
  },

  reformatDataKey(data) {
    let info = reformatSignalsFlat(data, HumanwebSignal.dataSubKey);
    let subKeyInfo = [];

    HumanwebSignal.dataSubKey.forEach((subKey) => {
      if (data.hasOwnProperty(subKey)) {
        subKeyInfo = reformatSignalsFlat(data[subKey]);

        // add generic description
        if (HumanwebSignal.dataSubKeyDes.hasOwnProperty(subKey)) {
          subKeyInfo.forEach((item) => {
            item['des'] = HumanwebSignal.dataSubKeyDes[subKey] || '';
          });
        }
        info = info.concat(subKeyInfo);
      }
    });

    return info;
  },

  reformatSignals(sig) {
    return (sig !== null && sig.hasOwnProperty(HumanwebSignal.dataKey)) ?
      reformatSignalsFlat(sig, [HumanwebSignal.dataKey])
        .concat(HumanwebSignal.reformatDataKey(sig[HumanwebSignal.dataKey])) :
      reformatSignalsFlat(sig);
  }
};

const Signals = {
  sigExpireTime: 1 * 60 * 1000, // miliseconds, if a signal is older than this, it's expired
  IPs: '',
  initialized: false,
  init() {
    Signals.IPs = local('signals-your-ip-address');
  },

  startListening() {
    if (!Signals.initialized) {
      Signals.initialized = SignalListener.init();
    }
  },

  stopListening() {
    if (Signals.initialized) {
      SignalListener.stopListen();
      Signals.initialized = false;
    }
  },

  setStreaming(boolVal) {
    streamMode = boolVal;
  },

  reformatSignals(sig, sigType) {
    /*
      @param {str} sigType: hw (human web), query (query log), tel (telemetry)
      @param (json obj) or ([json obj] -> if sigType = tel) sig: content,
       e.g.  {"query": "find cliqz", "result": "1"}
      or [{"action": "key-stroke", "session": "dffdfhdh"}]
     */
    let info;

    // add data points that we have but we don't send
    if (sigType === 'tel') {
      info = [];
      sig.forEach((s) => {
        info = info.concat(reformatSignalsFlat(s));
      });
      info = info.concat(reformatSignalsFlat({
        GPS: local('signals-your-location'),
        query: local('signals-what-you-search')
      }, [], 'blocked'));
    }

    if (sigType === 'ql') {
      info = reformatSignalsFlat(sig)
        .concat(reformatSignalsFlat({
          'search history': local('signals-private-urls')
        }, [], 'blocked'));

      if (info.length > 0) {
        if (sig.loc === undefined) {
          info = info.concat(reformatSignalsFlat({
            GPS: local('signals-your-location')
          }, [], 'blocked'));
        }
        if (utils.getPref('hpn-query') === true) {
          info = info.concat(reformatSignalsFlat({
            'your identity': local('signals-your-ip-id') + Signals.IPs
          }, [], 'blocked'));
        }
      }
    }

    if (sigType === 'hw') {
      info = HumanwebSignal.reformatSignals(sig);
      if (info.length > 0) {
        info = info.concat(reformatSignalsFlat({
          'your identity': local('signals-your-ip-id') + Signals.IPs
        }, [], 'blocked'));
      }
    }

    return info;
  },

  getSignalsToDashboard() {
    const info = {};
    Object.keys(SignalListener.SigCache).forEach((sigType) => {
      if (sigType === 'hw' && utils.getPref('dnt') === true) {
        info[sigType] = [{
          name: '',
          val: local('signals-humanweb-inactive-message'),
          send: local('signals-humanweb-inactive'),
          unique: true,
          des: ''
        }];
      } else {
        info[sigType] = Date.now() - SignalListener.SigCache[sigType].timestamp < Signals.sigExpireTime ?
          Signals.reformatSignals(SignalListener.SigCache[sigType].sig, sigType) : [];
      }
    });
    return info;
  }
};

export default Signals;
