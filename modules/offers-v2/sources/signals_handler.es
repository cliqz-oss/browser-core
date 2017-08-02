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
import DBHelper from './db_helper';
import { generateUUID } from './utils';


////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'signals_handler';
const STORAGE_DB_DOC_ID = 'offers-signals';

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
// Helper methods
//

function addOrCreate(d, field, value = 1) {
  const elem = d[field];
  if (elem) {
    d[field] = elem + value;
  } else {
    d[field] = value;
  }
}



////////////////////////////////////////////////////////////////////////////////
export class SignalHandler {

  //
  // @brief [v3.0] we will not use bucket anymore so now we will have the following
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
  //
  // additionally we will have types of signals that will be stored in different
  // containers. Each type of signal should be identified with a unique ID as well.
  // @param sender is the interface to be use to sent messages, it will take:
  //  sender.httpPost args: (url, success_callback, data, onerror_callback, timeout)
  //
  constructor(offersDB, sender) {
    this.db = new DBHelper(offersDB);
    if (!sender) {
      sender = utils;
    }
    this.sender = sender;
    // map from sig_type -> (sig_id -> sig_data)
    this.sigMap = {};
    // the builders
    this.sigBuilder = {
      'campaign': this._sigBuilderCampaign.bind(this),
      'action': this._sigBuilderAction.bind(this)
    }

    // the signal queue
    this.sigsToSend = {};

    // a mapping (signalType, signalKey) to the number of retries - sending signals to backend
    // we don't want to retry sending a signal more than 3 times because of network error
    this.signalSendingRetries = {};

    // dirty flag to save or not data
    this.dbDirty = false;

    // load the persistent data
    this._loadPersistenceData();

    // set the interval timer method to send the signals
    this.sendIntervalTimer = null;
    this._startSendSignalsLoop(OffersConfigs.SIGNALS_OFFERS_FREQ_SECS);

    // save signals in a frequent way
    const self = this;
    if (OffersConfigs.SIGNALS_LOAD_FROM_DB) {
      this.saveInterval = utils.setInterval(() => {
        if (self.dbDirty) {
          self._savePersistenceData();
        }
      },
      OffersConfigs.SIGNALS_AUTOSAVE_FREQ_SECS * 1000);
    }
  }

  _isMaximumNumRetriesReached(signalType, signalKey) {
    if (signalType in this.signalSendingRetries &&
      signalKey in this.signalSendingRetries[signalType]) {
      const nRetries = this.signalSendingRetries[signalType][signalKey];
      return nRetries >= OffersConfigs.MAX_RETRIES;
    }
    return false;
  }

  _removeNumRetriesRecord(signalType, signalKey) {
    if (signalType in this.signalSendingRetries &&
      signalKey in this.signalSendingRetries[signalType]) {
      delete this.signalSendingRetries[signalType][signalKey];
    }
  }

  _increaseNumRetriesRecord(signalType, signalKey) {
    if (!(signalType in this.signalSendingRetries)) {
      this.signalSendingRetries[signalType] = { [signalKey]: 1 };
      return;
    }

    if (!(signalKey in this.signalSendingRetries[signalType])) {
      this.signalSendingRetries[signalType][signalKey] = 1;
      return;
    }

    this.signalSendingRetries[signalType][signalKey] += 1;
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

    if (this.saveInterval) {
      utils.clearInterval(this.saveInterval);
      delete this.saveInterval;
    }
  }

  savePersistenceData() {
    return this._savePersistenceData();
  }


  //////////////////////////////////////////////////////////////////////////////
  //                    Special methods for signals types
  //////////////////////////////////////////////////////////////////////////////

  //
  // @brief We will store the following internal structure. Note that
  //        the internal structure is not the same than the one we will sent, still
  //        we need to have a possible way of building the structure from this one
  //
  //        This method will be used to increment the signals counters / values.
  //
  // {
  //   "campaign": {
  //     campaign_id_1: {
  //       created_ts: timestamp,
  //       modified_ts: timestamp,
  //       be_sync: false,
  //       seq: 0,
  //       data: {
  //         ucid: unique campaign id per user.,
  //         "offers": {
  //           offer_id_1: {
  //             created_ts: timestamp,
  //             "origins": {
  //               origin_id_1: {
  //                 signal_id_1: XXX,
  //                 ...
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  // }
  //
  // @param cid     is the campaign id
  // @param oid     is the offer id
  // @param origID  is the origin id of the signal
  // @param sid     is the signal id
  // @param count   is the number for which we want to increase the signal
  //
  setCampaignSignal(cid, oid, origID, sid, count = 1) {
    if (!cid || !oid || !origID || !sid) {
      lwarn('setCampaignSignal: invalid arguments?: ' +
            ' - cid: ' + cid +
            ' - oid: ' + oid +
            ' - origID: ' + origID +
            ' - sid: ' + sid);
      return false;
    }
    const sigType = 'campaign';
    const sigKey = cid;

    let sigInfo = this._getOrCreateSignal(sigType, sigKey);
    if (!sigInfo) {
      lerr('setCampaignSignal: cannot create or get campaign signal: ' + sigKey);
      return false;
    }

    // now we update the data here
    let sigData = sigInfo.data;

    // check if we have the ucid
    if (!sigData.ucid) {
      // generate a new one
      sigData.ucid = generateUUID();
    }
    let offers = sigData.offers;
    if (!offers) {
      sigData.offers = offers = {};
    }

    // get the offer
    let currOffer = offers[oid];
    if (!currOffer) {
      offers[oid] = currOffer = {
        created_ts: Date.now(),
        origins: {}
      }
    }
    let origins = currOffer.origins;
    let origin = origins[origID];
    if (!origin) {
      origins[origID] = origin = {}
    }

    // create or increment the given signal
    addOrCreate(origin, sid, count);

    // mark it as modified
    this._markSignalAsModified(sigType, sigKey);

    linfo(`setCampaignSignal: new signal added: ${cid} - ${oid} - ${origID} - ${sid} - +${count}`);
    return true;
  }

  /**
   * Will record a new action signal (basically normal telemetry that is not associated
   * to a particular offer or campaign id).
   * @param {string} actionID the action id (signal id)
   * @param {string} origID   the origin of the signal (who is producing it)
   * @param count   is the number for which we want to increase the signal
   * @description The internal information will be stored in a different way,
   * <pre>
   * {
   *  "action": {
   *    origin_id_1: {
   *      created_ts: timestamp,
   *      modified_ts: timestamp,
   *      be_sync: false,
   *      seq: 0,
   *      data: {
   *        uuid: unique campaign id per user.,
   *        "actions": {
   *          action_id_1: 1,
   *          action_id_2: N
   *        }
   *      }
   *    }
   *   }
   * }
   * </pre>
   *
   * We should send to the BE:
   * <pre>
   *   {
   *       "action": "offers-signal",
   *       "signal_id": "origin_here",
   *       "timestamp": "20170421",
   *       "payload": {
   *           "v": 3,
   *           "ex_v": "1.16.0",
   *           "is_developer": true,
   *           "type": "action",
   *           "data": {
   *               "o_id": "origin_here",
   *               "o_data": {
   *                   "seq": 0,
   *                   "created_ts": 1492768930539,
   *                   "uuid": "937bc2b7-5e27-772c-5d85-41da0110dc86",
   *                   "actions": {
   *                       "action_1": 0,
   *                       "action_2": 10,
   *                   }
   *               }
   *           }
   *       }
   * </pre>
   */
  setActionSignal(actionID, origID, count = 1) {
    if (!actionID || !origID) {
      lwarn(`setActionSignal: invalid arguments?: ${actionID} - ${origID}`);
      return false;
    }
    const sigType = 'action';
    const sigKey = origID;

    let sigInfo = this._getOrCreateSignal(sigType, sigKey);
    if (!sigInfo) {
      lerr(`setActionSignal: cannot create or get action signal: ${sigKey}`);
      return false;
    }

    // now we update the data here
    let sigData = sigInfo.data;

    // check if we have the uuid
    if (!sigData.uuid) {
      // generate a new one
      sigData.uuid = generateUUID();
    }

    // get the actions
    let actions = sigData.actions;
    if (!actions) {
      actions = sigData['actions'] = {};
    }

    // create or increment the given signal
    addOrCreate(actions, actionID, count);

    // mark it as modified
    this._markSignalAsModified(sigType, sigKey);

    linfo(`setActionSignal: new signal added: ${origID} - ${actionID} - +${count}`);
    return true;
  }

  //////////////////////////////////////////////////////////////////////////////
  //                            PRIVATE METHODS

  _createSignal(sigData) {
    return {
      created_ts: Date.now(),
      modified_ts: Date.now(),
      seq: 0,
      be_sync: false,
      data: sigData
    };
  }

  //
  // @brief set a signal on a particular container
  //
  _markSignalAsModified(sigType, sigKey) {
    if (!sigType || !sigKey) {
      lwarn('_markSignalAsModified: invalid args');
      return;
    }
    // check if the container exists
    let container = this.sigMap[sigType];
    if (!container) {
      lwarn('_markSignalAsModified: invalid signal? cannot be updated');
      return;
    }

    // check if the sig exists for the given container
    let sigInfo = container[sigKey];
    if (!sigInfo) {
      lwarn('_markSignalAsModified: signal is null, cannot be updated');
      return;
    }
    sigInfo.modified_ts = Date.now();

    // mark it as dirty
    sigInfo.be_sync = false;

    // we mark the DB as dirty here
    this.dbDirty = true;

    this._addSignalToBeSent(sigType, sigKey);
  }

  //
  // @brief this method will create the container if not exists, otherwise will
  //        return the container (in container.data should be stored the data)
  // @return on error null otherwise the pointer to the signalData
  //
  _getOrCreateSignal(sigType, sigKey, initData={}) {
    if (!sigType || !sigKey) {
      lwarn('_getOrCreateSignal: invalid args');
      return null;
    }
    // check if the container exists
    let container = this.sigMap[sigType];
    if (!container) {
      // create a new one
      this.sigMap[sigType] = container = {};
    }

    // check if the sig exists for the given container
    let sigInfo = container[sigKey];
    if (!sigInfo) {
      linfo('_setSignalData: creating new signal in ' + sigType + ' - ' + sigKey);
      container[sigKey] = sigInfo = this._createSignal(initData);
    }
    return sigInfo;
  }

  _getSignalInfo(sigType, sigKey) {
    if (!sigType || !sigKey) {
      lwarn('getSignalData: sigType or sigKey null?');
      return null;
    }
    let container = this.sigMap[sigType];
    if (!container) {
      return null;
    }
    return container[sigKey];
  }

// (EX-4191) Fix hpn-ts format to "yyyyMMdd"
  _getHpnTimeStamp(){
    var now = new Date();
    return now.toISOString().slice(0,10).replace(/-/g,"");
  }

  _getMinuteTimestamp() {
    return Math.floor((Date.now()/1000)/60);
  }

  _addSignalToBeSent(sigType, sigKey) {
    let container = this.sigsToSend[sigType];
    if (!container) {
      this.sigsToSend[sigType] = container = new Set();
    }
    container.add(sigKey);
  }

  _sendSignalsToBE() {
    // iterate over all the signals and send them to the BE
    linfo('_sendSignalsToBE: SENDING SIGNALSS TO BE!!!');
    const isDeveloper = utils.getPref('developer', false) ||
                        utils.getPref('offersDevFlag', false);

    let GID = utils.getPref('anolysisGID');
    try {
      GID = JSON.parse(String(GID));
    } catch (err) {
      lerr('sendSignalsToBE: GID is undefined');
      GID = 'undefined';
    }

    let self = this;
    try {
      const sigsKeysToSend = Object.keys(self.sigsToSend);
      const numSignalsToSend = sigsKeysToSend.length;

      sigsKeysToSend.forEach(function(signalType) {
        const container = self.sigsToSend[signalType];
        const containerArr = [...container];
        Object.keys(containerArr).forEach(function(i) {
          const sigID = containerArr[i];
          if (self._isMaximumNumRetriesReached(signalType, sigID)){
            return;
          }

          try {
            let sigInfo = self._getSignalInfo(signalType, sigID);
            if (!sigInfo || !sigInfo.data) {
              lerr('_sendSignalsToBE: we have a signal on the queue but the signal was removed?: ' +
                signalType + ' - ' + sigID + ' - ' + JSON.stringify(self.sigMap));
              return;
            }
            let sigData = sigInfo.data;

            // this will help us to avoid duplicated signals
            if (sigInfo.be_sync) {
              return;
            }

            // build the signal depending on the type
            let builder = self.sigBuilder[signalType];
            if (!builder) {
              lerr('_sendSignalsToBE: we dont have a builder for the sigtype: ' + signalType);
              return;
            }

            let sigDataToSend = builder(sigID, sigInfo);
            if (!sigDataToSend) {
              lerr('_sendSignalsToBE: something happened building the signal. ' +
                'sigtype: ' + signalType + ' data: ' + JSON.stringify(sigInfo));
              return;
            }

            // now we have the data in the proper structure to be sent over hpn

            const hpnSignal = {
              action: OffersConfigs.SIGNALS_HPN_BE_ACTION,
              signal_id: sigID,
              timestamp: self._getHpnTimeStamp(),
              payload: {
                v : OffersConfigs.SIGNALS_VERSION,
                ex_v: config.EXTENSION_VERSION,
                is_developer: isDeveloper,
                gid : GID,
                type: signalType,
                sent_ts: self._getMinuteTimestamp(),
                data: sigDataToSend
              }
            };

            const hpnStrSignal = JSON.stringify(hpnSignal);
            self.sender.httpPost(OffersConfigs.SIGNALS_HPN_BE_ADDR,
              function (success) {
                linfo('sendSignalsToBE: hpn signal sent');
                const telMonitorSignal = {
                  type: 'offers_monitor',
                  is_developer: isDeveloper,
                  batch_total: numSignalsToSend,
                  msg_delivered: true,
                };
                utils.telemetry(telMonitorSignal);
                self._removeFromSigsToSend(this.bindedST, this.bindedSID);
                self._removeNumRetriesRecord(this.bindedST, this.bindedSID);
              }.bind({ bindedST: signalType, bindedSID: sigID }),
              hpnStrSignal,
              function (err) {
                lerr('sendSignalsToBE: error sending signal to hpn: ' + err);
                const telMonitorSignal = {
                  type: 'offers_monitor',
                  is_developer: isDeveloper,
                  batch_total: numSignalsToSend,
                  msg_delivered: false,
                };
                utils.telemetry(telMonitorSignal);
                self._increaseNumRetriesRecord(this.bindedST, this.bindedSID);
              }.bind({ bindedST: signalType, bindedSID: sigID }));
            linfo('sendSignalsToBE: hpn: ' + hpnStrSignal);
          } catch (err) {
            lerr('send one signal: something bad happened: ' + err);
            self._removeFromSigsToSend(signalType, sigID);
          }
        });
      });
    } catch (err) {
      lerr('sendSignalsToBE: something bad happened: ' + err);
      // we still want to remove here the signals to avoid infinit loop error?
      // this still means we will remove signals that will never reach the BE
      delete self.sigsToSend;
      self.sigsToSend = {};
    }
    return true;
  }

  _removeFromSigsToSend(signalType, signalID) {
    const sInfo = this._getSignalInfo(signalType, signalID);
    // we mark the signal as sent to the BE
    sInfo.be_sync = true;
    // if we don't mark the db dirty here we will not be able to know that
    // was already sync
    this.dbDirty = true;

    if (signalType in this.sigsToSend) {
      this.sigsToSend[signalType].delete(signalID);
      if (this.sigsToSend[signalType].size === 0) {
        delete this.sigsToSend[signalType];
      }
    }
  }

  // this method will configure the interval call to
  _startSendSignalsLoop(timeToSendSecs) {
    this.sendIntervalTimer = utils.setInterval(function () {
      // here we need to process this particular bucket
      if (Object.keys(this.sigsToSend).length > 0) {
        this._sendSignalsToBE();
      } else {
        linfo('_startSendSignalsLoop: nothing to send');
      }
    }.bind(this), timeToSendSecs * 1000);
  }

  // save persistence data
  _savePersistenceData() {
    // for testing comment the following check
    if (!OffersConfigs.SIGNALS_LOAD_FROM_DB) {
      linfo('_savePersistenceData: skipping the saving');
      return Promise.resolve(true);
    }
    // is db dirty?
    if (!this.dbDirty) {
      return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
      return this.db.saveDocData(STORAGE_DB_DOC_ID,
        {
          sig_map: this.sigMap
        }
      ).then(() => {
        this.dbDirty = false;
        resolve(true);
      });
    });
  }

  // load persistence data
  _loadPersistenceData() {
    // for testing comment the following check
    if (!OffersConfigs.SIGNALS_LOAD_FROM_DB) {
      linfo('_loadPersistenceData: skipping the loading');
      return Promise.resolve(true);
    }

    let self = this;
    return self.db.getDocData(STORAGE_DB_DOC_ID).then(docData => {
        if (!docData || !docData.sig_map) {
          lerr('_loadPersistenceData: something went wrong loading the data?');
          return;
        }
        // set the data
        self.sigMap = docData.sig_map;

        // db is not dirty anymore
        self.dbDirty = false;

        // remove old signals and add all the keys that are not sync with the BE yet
        const currentTS = Date.now();
        Object.keys(self.sigMap).forEach((signalType) => {
          const container = self.sigMap[signalType];
          Object.keys(container).forEach((sigID) => {
            const sigData = self._getSignalInfo(signalType, sigID);;
            if (!sigData) {
              return;
            }
            const timeDiff = (currentTS - sigData.modified_ts) / 1000;
            if (timeDiff >= OffersConfigs.SIGNALS_OFFERS_EXPIRATION_SECS) {
              // remove this signal
              linfo('removing signal: ' + k + ' - data: ' + JSON.stringify(sigData));
              delete container[k];
              return;
            }
            if (!sigData.be_sync) {
              self._addSignalToBeSent(signalType, sigID);
              linfo('_loadPersistenceData: signal ' + sigID + ' added to be sent to BE');
            }
          });
        });
        Promise.resolve(true);
      }).catch(err => {
        lerr('_loadPersistenceData: error loading the storage data...: ' + JSON.stringify(err));
        Promise.resolve(false);
      });
  }

  //////////////////////////////////////////////////////////////////////////////
  //                      SIGNALS STRUCTURE BUILDERS
  //
  // each of those builders should return the data that we will put on the payload
  // basically.
  //////////////////////////////////////////////////////////////////////////////

  _sigBuilderCampaign(sigKey, sigData) {
    // we are storing the information as explained on setCampaignSignal
    // and we have to build it as explained on
    // https://cliqztix.atlassian.net/wiki/spaces/SBI/pages/87966116/Real+Time+Analytics
    if (!sigKey || !sigData || !sigData.data) {
      lwarn('_sigBuilderCampaign: invalid args');
      return null;
    }
    const sdata = sigData.data;
    let result = {
      c_id: sigKey,
      c_data: {
        seq: sigData.seq,
        created_ts: sigData.created_ts,
        ucid: sdata.ucid,
        offers: []
      }
    };

    // increment the sequence number here
    sigData.seq = sigData.seq + 1;

    // add the offers
    let offers = result.c_data.offers;
    Object.keys(sdata.offers).forEach((offerID) => {
      const offerData = sdata.offers[offerID];
      const origins = offerData.origins;
      let resultOffer = {
        offer_id: offerID,
        created_ts: offerData.created_ts,
        offer_data: []
      };
      let resOfferData = resultOffer.offer_data;

      Object.keys(origins).forEach((originID) => {
        let resultOrigin = {
          origin: originID,
          origin_data: origins[originID]
        }
        resOfferData.push(resultOrigin);
      });
      offers.push(resultOffer);
    });

    return result;
  }

  _sigBuilderAction(sigKey, sigData) {
    // we are storing the information as explained on setActionSignal
    // and we have to build it as explained on
    // https://cliqztix.atlassian.net/wiki/spaces/SBI/pages/87966116/Real+Time+Analytics
    if (!sigKey || !sigData || !sigData.data) {
      lwarn('_sigBuilderAction: invalid args');
      return null;
    }

    const sdata = sigData.data;
    let result = {
      o_id: sigKey,
      o_data: {
        seq: sigData.seq,
        created_ts: sigData.created_ts,
        uuid: sdata.uuid,
        actions: sdata.actions
      }
    };

    // increment the sequence number here
    sigData.seq = sigData.seq + 1;

    return result;
  }


}
