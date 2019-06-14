/* eslint no-param-reassign: 'off' */
/* eslint no-restricted-syntax: 'off' */

/*
 * Functions to handle collecting to selecting / preparing signals for the dashboard
 */

import inject from '../core/kord/inject';
import events from '../core/events';
import prefs from '../core/prefs';
import { addListener, removeListener } from '../core/http';
import { getMessage } from '../core/i18n';
import CliqzHumanWeb from '../human-web/human-web';
import { getDetailsFromUrl, tryDecodeURIComponent } from '../core/url';
import telemetry from '../telemetry/background';

const TELEMETRY_SERVICE = inject.service('telemetry', ['installProvider', 'uninstallProvider']);

let streamMode = false;

function local(key) {
  return getMessage(key);
}

function parseQueryString(qstr) {
  const query = {};
  const a = (qstr || '').split('&');
  for (const i in a) {
    if (Object.prototype.hasOwnProperty.call(a, i)) {
      const b = a[i].split('=');
      query[tryDecodeURIComponent(b[0])] = tryDecodeURIComponent(b[1]);
    }
  }

  return query;
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
        des: '' // todo: fill in descriptions
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

  startListeningToHumanWeb() {
    SignalListener.stopListeningToHumanWeb();
    SignalListener.humanWebSubscription = events.subscribe('human-web:signal-sent', (msg) => {
      SignalListener.SigCache.hw = {
        sig: msg,
        timestamp: Date.now()
      };
      SignalListener.fireNewDataEvent('hw');
    });
  },

  stopListeningToHumanWeb() {
    if (SignalListener.humanWebSubscription) {
      SignalListener.humanWebSubscription.unsubscribe();
      SignalListener.humanWebSubscription = null;
    }
  },

  monkeyPatchTelemetry: {
    name: 'monkeyPatch',
    send() {
      SignalListener.SigCache.tel = {
        sig: [lastElementArray(telemetry.trk)],
        timestamp: Date.now()
      };

      SignalListener.fireNewDataEvent('tel');
    },
  },

  onCliqzBackendRequest({ url }) {
    if (!url.startsWith(this.settings.RESULTS_PROVIDER)
        && !url.startsWith(this.settings.RESULTS_PROVIDER_LOG)) {
      return;
    }

    const queryLog = {};
    const qs = getDetailsFromUrl(url).query;
    const qsParams = parseQueryString(qs);
    Object.keys(qsParams).forEach((key) => {
      if (qsParams[key]) {
        queryLog[QUERY_LOG_PARAM[key] || key] = qsParams[key];
      }
    });

    SignalListener.SigCache.ql = { sig: queryLog, timestamp: Date.now() };
    SignalListener.fireNewDataEvent('ql');
  },

  init(settings) {
    this.settings = settings;
    if (!SignalListener.monkeyPatchHmw) {
      SignalListener.hwOrigin = CliqzHumanWeb.telemetry;
    }

    addListener(this.onCliqzBackendRequest.bind(this));

    if (SignalListener.monkeyPatchTelemetry) {
      TELEMETRY_SERVICE.installProvider(SignalListener.monkeyPatchTelemetry);
      SignalListener.startListeningToHumanWeb();

      // if Signals only start listens only when someone open the dashboard
      // -> there'll be no data to be shown
      // to avoid disappointment from the users, we will show the last telemetry signal
      // and the last Humanweb signal
      // stored in the queue (if any)

      // this should be the signal user clicking the privacy dashboard button
      SignalListener.SigCache.tel = {
        sig: [lastElementArray(telemetry.trk)],
        timestamp: Date.now()
      };
      // last human web signal
      try {
        SignalListener.SigCache.hw = {
          sig: lastElementArray(CliqzHumanWeb.safebrowsingEndpoint.getSendQueue()),
          timestamp: Date.now(),
        };
      } catch (e) {
        // cannot initialize, but the UI will update with the next sent signal
      }
      return true;
    }
    return false;
  },

  stopListen() {
    TELEMETRY_SERVICE.uninstallProvider(SignalListener.monkeyPatchTelemetry);
    removeListener(this.onCliqzBackendRequest);
    SignalListener.stopListeningToHumanWeb();
  }
};


const HumanwebSignal = {
  dataKey: 'payload',
  dataSubKey: ['c', 'r', 'e', 'x', 'red'],
  dataSubKeyDes: {
    r: 'signals-search-results',
    c: 'signals-visited-page',
    e: 'signals-count-action',
    x: 'signals-page-info',
    red: 'signals-redirected-links'
  },

  reformatDataKey(data) {
    let info = reformatSignalsFlat(data, HumanwebSignal.dataSubKey);
    let subKeyInfo = [];

    HumanwebSignal.dataSubKey.forEach((subKey) => {
      if (Object.prototype.hasOwnProperty.call(data, subKey)) {
        subKeyInfo = reformatSignalsFlat(data[subKey]);

        // add generic description
        if (Object.prototype.hasOwnProperty.call(HumanwebSignal.dataSubKeyDes, subKey)) {
          subKeyInfo.forEach((item) => {
            item.des = HumanwebSignal.dataSubKeyDes[subKey] || '';
          });
        }
        info = info.concat(subKeyInfo);
      }
    });

    return info;
  },

  reformatSignals(sig) {
    return (sig !== null && Object.prototype.hasOwnProperty.call(sig, HumanwebSignal.dataKey))
      ? reformatSignalsFlat(sig, [HumanwebSignal.dataKey])
        .concat(HumanwebSignal.reformatDataKey(sig[HumanwebSignal.dataKey]))
      : reformatSignalsFlat(sig);
  }
};

const Signals = {
  sigExpireTime: 1 * 60 * 1000, // miliseconds, if a signal is older than this, it's expired
  IPs: '',
  initialized: false,
  init(settings) {
    this.settings = settings;
    Signals.IPs = 'signals-your-ip-address';
  },

  startListening() {
    if (!Signals.initialized) {
      Signals.initialized = SignalListener.init(this.settings);
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
        if (prefs.get('hpn-query') === true) {
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
      if (sigType === 'hw' && prefs.get('humanWebOptOut') === true) {
        info[sigType] = [{
          name: '',
          val: local('signals-humanweb-inactive-message'),
          send: local('signals-humanweb-inactive'),
          unique: true,
          des: ''
        }];
      } else {
        info[sigType] = Date.now() - SignalListener.SigCache[sigType].timestamp
          < Signals.sigExpireTime
          ? Signals.reformatSignals(SignalListener.SigCache[sigType].sig, sigType)
          : [];
      }
    });
    return info;
  }
};

export default Signals;
