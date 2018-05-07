/* eslint no-param-reassign: off */

/*
 * Module used to send signals to the BE every OffersConfigs.SIGNALS_OFFERS_FREQ_SECS
 * seconds.
 * Each signal (id) will be kept on the DB till OffersConfigs.SIGNALS_OFFERS_EXPIRATION_SECS
 * is reached from the last modification time.
 */
import logger from '../common/offers_v2_logger';
import utils from '../../core/utils';
import OffersConfigs from '../offers_configs';
import config from '../../core/config';
import SimpleDB from '../../core/persistence/simple-db';
import setTimeoutInterval from '../../core/helpers/timeout';
import { generateUUID } from '../utils';
import {
  isDeveloper,
  getGID,
  getHpnTimeStamp,
  getMinuteTimestamp
} from './utils';

// /////////////////////////////////////////////////////////////////////////////
// consts
const STORAGE_DB_DOC_ID = 'offers-signals';

// /////////////////////////////////////////////////////////////////////////////
// Helper methods

function addOrCreate(d, field, value = 1) {
  const elem = d[field];
  if (elem) {
    d[field] = elem + value;
  } else {
    d[field] = value;
  }
}

function constructSignal(signalID, signalType, signalData) {
  return {
    action: OffersConfigs.SIGNALS_HPN_BE_ACTION,
    signal_id: signalID,
    timestamp: getHpnTimeStamp(),
    payload: {
      v: OffersConfigs.SIGNALS_VERSION,
      ex_v: config.EXTENSION_VERSION,
      is_developer: isDeveloper(),
      gid: getGID(),
      type: signalType,
      sent_ts: getMinuteTimestamp(),
      data: signalData,
    },
  };
}

// /////////////////////////////////////////////////////////////////////////////
export default class SignalHandler {
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
    this.db = new SimpleDB(offersDB, logger, 'doc_data');
    if (!sender) {
      sender = utils;
    }
    this.sender = sender;
    // map from sig_type -> (sig_id -> sig_data)
    this.sigMap = {};
    // the builders
    this.sigBuilder = {
      campaign: this._sigBuilderCampaign.bind(this),
      action: this._sigBuilderAction.bind(this),
    };

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
      this.saveInterval = setTimeoutInterval(() => {
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
      this.sendIntervalTimer.stop();
      this.sendIntervalTimer = null;
    }

    if (this.saveInterval) {
      this.saveInterval.stop();
      this.saveInterval = null;
    }
  }

  savePersistenceData() {
    return this._savePersistenceData();
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                    Special methods for signals types
  // ///////////////////////////////////////////////////////////////////////////

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
      logger.warn(`setCampaignSignal: invalid arguments?: - cid: ${cid} - oid: ${oid}
                  - origID: ${origID} - sid: ${sid}`);
      return false;
    }
    const sigType = 'campaign';
    const sigKey = cid;

    const sigInfo = this._getOrCreateSignal(sigType, sigKey);
    if (!sigInfo) {
      logger.error(`setCampaignSignal: cannot create or get campaign signal: ${sigKey}`);
      return false;
    }

    // now we update the data here
    const sigData = sigInfo.data;

    // check if we have the ucid
    if (!sigData.ucid) {
      // generate a new one
      sigData.ucid = generateUUID();
    }
    let offers = sigData.offers;
    if (!offers) {
      sigData.offers = {};
      offers = sigData.offers;
    }

    // get the offer
    let currOffer = offers[oid];
    if (!currOffer) {
      offers[oid] = {
        created_ts: Date.now(),
        origins: {}
      };
      currOffer = offers[oid];
    }
    const origins = currOffer.origins;
    let origin = origins[origID];
    if (!origin) {
      origins[origID] = {};
      origin = origins[origID];
    }

    // create or increment the given signal
    addOrCreate(origin, sid, count);

    // mark it as modified
    this._markSignalAsModified(sigType, sigKey);

    logger.info(`setCampaignSignal: new signal added: ${cid} - ${oid} - ${origID} - ${sid} - +${count}`);
    return true;
  }

  /**
   * This method will remove all the signals associated to a campaign and offer id
   * meaning that will be no entry for that offer anymore.
   * If a new signal is set for that cid / oid again, a new unique user/campaign id
   * will be generated
   * @param  cid is the campaign id
   * @param  oid is the offer id
   *
   * @note in case of invalid arguments this method does nothing
   */
  removeCampaignSignals(cid) {
    if (!cid) {
      logger.error('invalid cid or oid', cid);
      return;
    }
    // check if we have the entry
    const container = this.sigMap.campaign ? this.sigMap.campaign[cid] : null;
    if (!container) {
      logger.info('no signal found for cid', cid);
      return;
    }

    logger.info('Removing signals for cid: ', cid);

    // we now just remove it and mark it as dirty
    delete this.sigMap.campaign[cid];
    this.dbDirty = true;

    // remove it from the list of signals to be sent if we have it there
    this._removeFromSigsToSend('campaign', cid);
  }

  sendCampaignSignalNow(cid) {
    // we first need to try to send the signal
    this._forceSignalDelivery('campaign', cid);
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
      logger.warn(`setActionSignal: invalid arguments?: ${actionID} - ${origID}`);
      return false;
    }
    const sigType = 'action';
    const sigKey = origID;

    const sigInfo = this._getOrCreateSignal(sigType, sigKey);
    if (!sigInfo) {
      logger.error(`setActionSignal: cannot create or get action signal: ${sigKey}`);
      return false;
    }

    // now we update the data here
    const sigData = sigInfo.data;

    // check if we have the uuid
    if (!sigData.uuid) {
      // generate a new one
      sigData.uuid = generateUUID();
    }

    // get the actions
    let actions = sigData.actions;
    if (!actions) {
      sigData.actions = {};
      actions = sigData.actions;
    }

    // create or increment the given signal
    addOrCreate(actions, actionID, count);

    // mark it as modified
    this._markSignalAsModified(sigType, sigKey);

    logger.info(`setActionSignal: new signal added: ${origID} - ${actionID} - +${count}`);
    return true;
  }

  // ///////////////////////////////////////////////////////////////////////////
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
      logger.warn('_markSignalAsModified: invalid args');
      return;
    }
    // check if the container exists
    const container = this.sigMap[sigType];
    if (!container) {
      logger.warn('_markSignalAsModified: invalid signal? cannot be updated');
      return;
    }

    // check if the sig exists for the given container
    const sigInfo = container[sigKey];
    if (!sigInfo) {
      logger.warn('_markSignalAsModified: signal is null, cannot be updated');
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
  _getOrCreateSignal(sigType, sigKey, initData = {}) {
    if (!sigType || !sigKey) {
      logger.warn('_getOrCreateSignal: invalid args');
      return null;
    }
    // check if the container exists
    let container = this.sigMap[sigType];
    if (!container) {
      // create a new one
      this.sigMap[sigType] = {};
      container = this.sigMap[sigType];
    }

    // check if the sig exists for the given container
    let sigInfo = container[sigKey];
    if (!sigInfo) {
      logger.info(`_setSignalData: creating new signal in ${sigType} - ${sigKey}`);
      container[sigKey] = this._createSignal(initData);
      sigInfo = container[sigKey];
    }
    return sigInfo;
  }

  _getSignalInfo(sigType, sigKey) {
    if (!sigType || !sigKey) {
      logger.warn('getSignalData: sigType or sigKey null?');
      return null;
    }
    const container = this.sigMap[sigType];
    if (!container) {
      return null;
    }
    return container[sigKey];
  }

  _addSignalToBeSent(sigType, sigKey) {
    let container = this.sigsToSend[sigType];
    if (!container) {
      this.sigsToSend[sigType] = new Set();
      container = this.sigsToSend[sigType];
    }
    container.add(sigKey);
  }

  _sendSignalsToBE() {
    // iterate over all the signals and send them to the BE
    logger.info('SENDING SIGNALSS TO BE!!!');
    const self = this;
    try {
      const sigsKeysToSend = Object.keys(self.sigsToSend);
      const numSignalsToSend = sigsKeysToSend.length;

      sigsKeysToSend.forEach((signalType) => {
        const container = self.sigsToSend[signalType];
        const containerArr = [...container];
        Object.keys(containerArr).forEach((i) => {
          const sigID = containerArr[i];
          if (self._isMaximumNumRetriesReached(signalType, sigID)) {
            return;
          }

          try {
            const sigInfo = self._getSignalInfo(signalType, sigID);
            if (!sigInfo || !sigInfo.data) {
              logger.error(`we have a signal on the queue but
                            the signal was removed?: ${signalType} - ${sigID} -
                            ${JSON.stringify(self.sigMap)}`);
              return;
            }

            // this will help us to avoid duplicated signals
            if (sigInfo.be_sync) {
              return;
            }

            // build the signal depending on the type
            const builder = self.sigBuilder[signalType];
            if (!builder) {
              logger.error(`we dont have a builder for the sigtype: ${signalType}`);
              return;
            }

            const sigDataToSend = builder(sigID, sigInfo);
            if (!sigDataToSend) {
              logger.error('something happened building the signal. ', JSON.stringify(sigInfo));
              return;
            }

            // now we have the data in the proper structure to be sent over hpn
            const hpnSignal = constructSignal(sigID, signalType, sigDataToSend);
            const hpnStrSignal = JSON.stringify(hpnSignal);

            self.sender.httpPost(OffersConfigs.SIGNALS_HPN_BE_ADDR,
              function succesFun() {
                logger.info('sendSignalsToBE: hpn signal sent');
                const telMonitorSignal = {
                  type: 'offers_monitor',
                  is_developer: isDeveloper(),
                  batch_total: numSignalsToSend,
                  msg_delivered: true,
                };
                utils.telemetry(telMonitorSignal);
                self._removeFromSigsToSend(this.bindedST, this.bindedSID);
                self._removeNumRetriesRecord(this.bindedST, this.bindedSID);
              }.bind({ bindedST: signalType, bindedSID: sigID }),
              hpnStrSignal,
              function errFun(err) {
                logger.error('sendSignalsToBE: error sending signal to hpn: ', err);
                const telMonitorSignal = {
                  type: 'offers_monitor',
                  is_developer: isDeveloper(),
                  batch_total: numSignalsToSend,
                  msg_delivered: false,
                };
                utils.telemetry(telMonitorSignal);
                self._increaseNumRetriesRecord(this.bindedST, this.bindedSID);
              }.bind({ bindedST: signalType, bindedSID: sigID }));
            logger.info('sendSignalsToBE: hpn: ', hpnStrSignal);
          } catch (err) {
            logger.error('send one signal: something bad happened: ', err);
            self._removeFromSigsToSend(signalType, sigID);
          }
        });
      });
    } catch (err) {
      logger.error('sendSignalsToBE: something bad happened: ', err);
      // we still want to remove here the signals to avoid infinit loop error?
      // this still means we will remove signals that will never reach the BE
      self.sigsToSend = {};
    }
    return true;
  }

  /**
   * this is just a temporary function that should be properly implemented
   * when refactoring this module using a queue instead of the current mechanisms
   */
  _forceSignalDelivery(signalType, sigID) {
    const sigInfo = this._getSignalInfo(signalType, sigID);
    if (!sigInfo || !sigInfo.data) {
      logger.error(`we have a signal on the queue but
                    the signal was removed?: ${signalType} - ${sigID} -
                    ${JSON.stringify(this.sigMap)}`);
      return;
    }

    // build the signal depending on the type
    const builder = this.sigBuilder[signalType];
    if (!builder) {
      logger.error(`we dont have a builder for the sigtype: ${signalType}`);
      return;
    }

    const sigDataToSend = builder(sigID, sigInfo);
    if (!sigDataToSend) {
      logger.error('something happened building the signal. ', JSON.stringify(sigInfo));
      return;
    }

    // now we have the data in the proper structure to be sent over hpn
    const isDev = isDeveloper();
    const hpnSignal = constructSignal(sigID, signalType, sigDataToSend);
    const hpnStrSignal = JSON.stringify(hpnSignal);

    logger.debug('FORCE SIGNAL BEING SENT TO BE!!!');
    this.sender.httpPost(OffersConfigs.SIGNALS_HPN_BE_ADDR,
      () => {
        logger.info('sendSignalsToBE: hpn signal sent');
        const telMonitorSignal = {
          type: 'offers_monitor',
          is_developer: isDev,
          batch_total: 1,
          msg_delivered: true,
        };
        utils.telemetry(telMonitorSignal);
      },
      hpnStrSignal,
      (err) => {
        logger.error('sendSignalsToBE: error sending signal to hpn: ', err);
        const telMonitorSignal = {
          type: 'offers_monitor',
          is_developer: isDev,
          batch_total: 1,
          msg_delivered: false,
        };
        utils.telemetry(telMonitorSignal);
      }
    );
    logger.info('force signal sent to BE (sendSignalsToBE): hpn: ', hpnStrSignal);
  }

  _removeFromSigsToSend(signalType, signalID) {
    const sInfo = this._getSignalInfo(signalType, signalID);
    if (sInfo) {
      // we mark the signal as sent to the BE
      sInfo.be_sync = true;
    }
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
    this.sendIntervalTimer = setTimeoutInterval(() => {
      // here we need to process this particular bucket
      if (Object.keys(this.sigsToSend).length > 0) {
        this._sendSignalsToBE();
      }
    }, timeToSendSecs * 1000);
  }

  // save persistence data
  _savePersistenceData() {
    // for testing comment the following check
    if (!OffersConfigs.SIGNALS_LOAD_FROM_DB) {
      logger.info('_savePersistenceData: skipping the saving');
      return Promise.resolve(true);
    }
    // is db dirty?
    if (!this.dbDirty) {
      return Promise.resolve(true);
    }

    return new Promise(resolve =>
      this.db.upsert(STORAGE_DB_DOC_ID,
        {
          sig_map: this.sigMap
        }
      ).then(() => {
        this.dbDirty = false;
        resolve(true);
      })
    );
  }

  // load persistence data
  _loadPersistenceData() {
    // for testing comment the following check
    if (!OffersConfigs.SIGNALS_LOAD_FROM_DB) {
      logger.info('skipping the loading');
      return Promise.resolve(true);
    }

    const self = this;
    return self.db.get(STORAGE_DB_DOC_ID).then((docData) => {
      if (!docData || !docData.sig_map) {
        logger.error('something went wrong loading the data?');
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
          const sigData = self._getSignalInfo(signalType, sigID);
          if (!sigData) {
            return;
          }
          const timeDiff = (currentTS - sigData.modified_ts) / 1000;
          if (timeDiff >= OffersConfigs.SIGNALS_OFFERS_EXPIRATION_SECS) {
            // remove this signal
            logger.info(`removing signal: ${sigID} - data: ${JSON.stringify(sigData)}`);
            delete container[sigID];
            return;
          }
          if (!sigData.be_sync) {
            self._addSignalToBeSent(signalType, sigID);
            logger.info(`signal ${sigID} added to be sent to BE`);
          }
        });
      });
      Promise.resolve(true);
    }).catch((err) => {
      logger.error('error loading the storage data...:', err);
      Promise.resolve(false);
    });
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                      SIGNALS STRUCTURE BUILDERS
  //
  // each of those builders should return the data that we will put on the payload
  // basically.
  // ///////////////////////////////////////////////////////////////////////////

  _sigBuilderCampaign(sigKey, sigData) {
    // we are storing the information as explained on setCampaignSignal
    // and we have to build it as explained on
    // https://cliqztix.atlassian.net/wiki/spaces/SBI/pages/87966116/Real+Time+Analytics
    if (!sigKey || !sigData || !sigData.data) {
      logger.warn('_sigBuilderCampaign: invalid args');
      return null;
    }
    const sdata = sigData.data;
    const result = {
      c_id: sigKey,
      c_data: {
        seq: sigData.seq,
        created_ts: sigData.created_ts,
        ucid: sdata.ucid,
        offers: []
      }
    };

    // increment the sequence number here
    sigData.seq += 1;

    // add the offers
    const offers = result.c_data.offers;
    Object.keys(sdata.offers).forEach((offerID) => {
      const offerData = sdata.offers[offerID];
      const origins = offerData.origins;
      const resultOffer = {
        offer_id: offerID,
        created_ts: offerData.created_ts,
        offer_data: []
      };
      const resOfferData = resultOffer.offer_data;

      Object.keys(origins).forEach((originID) => {
        const resultOrigin = {
          origin: originID,
          origin_data: origins[originID],
        };
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
      logger.warn('_sigBuilderAction: invalid args');
      return null;
    }

    const sdata = sigData.data;
    const result = {
      o_id: sigKey,
      o_data: {
        seq: sigData.seq,
        created_ts: sigData.created_ts,
        uuid: sdata.uuid,
        actions: sdata.actions
      }
    };

    // increment the sequence number here
    sigData.seq += 1;

    return result;
  }
}
