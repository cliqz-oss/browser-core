/*
 * Module used to send signals to the BE every OffersConfigs.SIGNALS_OFFERS_FREQ_SECS
 * seconds.
 * Each signal (id) will be kept on the DB till OffersConfigs.SIGNALS_OFFERS_EXPIRATION_SECS
 * is reached from the last modification time.
 */

import { utils } from '../core/cliqz';
import LoggingHandler from './logging_handler';
import  OffersConfigs  from './offers_configs';
import config from '../core/config';


////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'signals_handler';

const DB_MAIN_FIELD = 'chrome://cliqz/content/offers-v2/signals_data.json';
const DB_PREFIX = 'sig_hand_';
const DB_SIGMAP_KEY = 'sig_map';

// TODO: remove this methods
function linfo(msg) {
  LoggingHandler.LOG_ENABLED && LoggingHandler.info(MODULE_NAME, msg);
}
function lwarn(msg) {
  LoggingHandler.LOG_ENABLED && LoggingHandler.warning(MODULE_NAME, msg);
}
function lerr(msg) {
  LoggingHandler.LOG_ENABLED && LoggingHandler.error(MODULE_NAME, msg);
}



////////////////////////////////////////////////////////////////////////////////
export class SignalHandler {

  //
  // @brief [v2.0] we will not use bucket anymore so now we will have the following
  //        data for each signal:
  // {
  //   sig_id: {
  //     created_ts: (when the signal was created),
  //     modified_ts: (when was last modified),
  //     be_sync: true/false (defines if the signal was sent properly to the BE)
  //     data: {
  //       // the signal data
  //     }
  //   }
  // }
  constructor() {
    // TODO: we need to translate the old data into the new one to not loose signals
    //       or we just dont care and start directly with the new approach.
    this.sigMap = {};

    // the signal queue
    this.sigsToSend = new Set();

    // load the persistent data
    this._loadPersistenceData();

    // set the interval timer method to send the signals
    this.sendIntervalTimer = null;
    this._startSendSignalsLoop(OffersConfigs.SIGNALS_OFFERS_FREQ_SECS);

    // TODO: load old data and delete file.
  }

  // destructor
  destroy() {
    // save data
    this._savePersistenceData();

    // stop interval
    if (this.sendIntervalTimer) {
      utils.clearInterval(this.sendIntervalTimer);
      this.sendIntervalTimer = null;
    }
  }

  savePersistenceData() {
    this._savePersistenceData();
  }


  //
  // @brief set the signal data to a given signal key, if not exists will be created
  //
  setSignalData(sigKey, sigData) {
    if (!sigKey) {
      lwarn('setSignalData: sigKey null?');
      return false;
    }
    var sigInfo = this.sigMap[sigKey];
    if (!sigInfo) {
      linfo('setSignalData: creating new signal: ' + sigKey);
      this.sigMap[sigKey] = sigInfo = this._createSignal(sigData);
    } else {
      sigInfo.data = sigData;
      sigInfo.modified_ts = Date.now();
    }

    // mark it as dirty
    sigInfo.be_sync = false;

    this._addSignalToBeSent(sigKey);
    return true;
  }

  //
  // @brief returns the given signal if exists or null if not
  //
  getSignalData(sigKey) {
    if (!sigKey) {
      lwarn('getSignalData: sigKey null?');
      return null;
    }
    var sigInfo = this.sigMap[sigKey];
    return !sigInfo ? null : sigInfo.data;
  }


  //////////////////////////////////////////////////////////////////////////////
  //                            PRIVATE METHODS

  _createSignal(sigData) {
    return {
      created_ts: Date.now(),
      modified_ts: Date.now(),
      be_sync: false,
      data: sigData
    };
  }

  _addSignalToBeSent(sigKey) {
    this.sigsToSend.add(sigKey);
  }

  _sendSignalsToBE() {
    // iterate over all the signals and send them to the BE
    linfo('_sendSignalsToBE: SENDING SIGNALSS TO BE!!!');
    const isDebug = utils.getPref('offersDevFlag', false);
    const isDeveloper = utils.getPref('developer', false);
    this.sigsToSend.forEach(sigID => {
      var sigData = this.sigMap[sigID];
      if (!sigData) {
        lerr('_sendSignalsToBE: we have a signal on the queue but the signal was removed?: ' +
             sigID + ' - ' + JSON.stringify(this.sigMap));
        return;
      }
      // this will help us to avoid duplicated signals
      if (sigData.be_sync) {
        return;
      }
      var signal = {
        type: 'offers',
        v : OffersConfigs.CURRENT_VERSION,
        ex_v: config.EXTENSION_VERSION,
        is_debug: isDebug,
        is_developer: isDeveloper,
        data: {}
      };
      signal.data[sigID] = sigData.data;
      utils.telemetry(signal);
      linfo('sendSignalsToBE: telemetry: ' + JSON.stringify(signal));

      // #GR-294: sending also to the hpn proxy, we need to remove the telemetry
      //          on the future once this is stable
      const hpnSignal = {
          action: OffersConfigs.SIGNALS_HPN_BE_ACTION,
          signal_id: sigID,
          timestamp: Date.now(),
          payload: {
            v : OffersConfigs.CURRENT_VERSION,
            ex_v: config.EXTENSION_VERSION,
            is_debug: isDebug,
            is_developer: isDeveloper,
            data: {}
          }
        };

      hpnSignal.payload.data[sigID] = sigData.data;
      const hpnStrSignal = JSON.stringify(hpnSignal);
      utils.httpPost(OffersConfigs.SIGNALS_HPN_BE_ADDR,
                     success => {linfo('sendSignalsToBE: hpn signal sent')},
                     hpnStrSignal,
                     err => {lerr('sendSignalsToBE: error sending signal to hpn: ' + err)});
      linfo('sendSignalsToBE: hpn: ' + hpnStrSignal);

      // we mark the signal as sent to the BE
      sigData.be_sync = true;
    }.bind(this));

    this.sigsToSend.clear();

    return true;
  }

  // this method will configure the interval call to
  _startSendSignalsLoop(timeToSendSecs) {
    this.sendIntervalTimer = utils.setInterval(function () {
      // here we need to process this particular bucket
      if (this.sigsToSend.size > 0) {
        this._sendSignalsToBE();
      } else {
        linfo('_startSendSignalsLoop: nothing to send');
      }
    }.bind(this), timeToSendSecs * 1000);
  }

  // save persistence data
  _savePersistenceData() {
    // for testing comment the following check
    if (OffersConfigs.DEBUG_MODE) {
      linfo('_loadPersistenceData: skipping the loading');
      return;
    }

    // save the full json into the same file
    try {
      linfo('_savePersistenceData: saving local data calleddd!');
      var localStorage = utils.getLocalStorage(DB_MAIN_FIELD);
      if (!localStorage) {
        lerr('_savePersistenceData: error getting the main local storage: ' + DB_MAIN_FIELD);
        return;
      }

      localStorage.setItem(DB_SIGMAP_KEY, JSON.stringify(this.sigMap));
      linfo('_savePersistenceData: ' + DB_SIGMAP_KEY + ' saved: ' + JSON.stringify(this.sigMap));
    } catch(e) {
      lerr('_savePersistenceData: error: ' + e);
    }
  }

  // load persistence data
  _loadPersistenceData() {
    // for testing comment the following check
    if (OffersConfigs.DEBUG_MODE) {
      linfo('_loadPersistenceData: skipping the loading');
      return true;
    }

    linfo('_loadPersistenceData: loading local data');
    var localStorage = utils.getLocalStorage(DB_MAIN_FIELD);
    if (!localStorage) {
      lerr('_loadPersistenceData: error getting the main local storage: ' + DB_MAIN_FIELD);
      return false;
    }

    // if we are on debug mode we will reload everything from extension
    var cache = localStorage.getItem(DB_SIGMAP_KEY);
    if (!cache) {
      linfo('_loadPersistenceData: nothing to load from the data base');
      return true;
    }

    try {
      this.sigMap = JSON.parse(cache);
    } catch(e) {
      lerr('_loadPersistenceData: error parsing the DB: ' + cache);
      this.sigMap = {};
      return false;
    }

    // remove old signals and add all the keys that are not sync with the BE yet
    const currentTS = Date.now();
    Object.keys(this.sigMap).forEach((k) => {
      const sigData = this.sigMap[k];
      if (!sigData) {
        return;
      }
      const timeDiff = (currentTS - sigData.modified_ts) / 1000;
      if (timeDiff >= OffersConfigs.SIGNALS_OFFERS_EXPIRATION_SECS) {
        // remove this signal
        linfo('removing signal: ' + k + ' - data: ' + JSON.stringify(sigData));
        delete this.sigMap[k];
        return;
      }
      if (!sigData.be_sync) {
        this._addSignalToBeSent(k);
      }
    });
  }

}
