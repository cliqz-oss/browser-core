/*
 * Module used to send signals to the BE every OffersConfigs.SIGNALS_OFFERS_FREQ_SECS
 * seconds.
 * Each signal (id) will be kept on the DB till OffersConfigs.SIGNALS_OFFERS_EXPIRATION_SECS
 * is reached from the last modification time.
 */

import logger from '../common/offers_v2_logger';
import telemetry from '../../core/services/telemetry';
import { httpPost } from '../../core/http';
import OffersConfigs from '../offers_configs';
import SimpleDB from '../../core/persistence/simple-db';
import pacemaker from '../../core/services/pacemaker';
import { generateUUID, isDeveloper } from '../utils';
import { constructSignal, addOrCreate } from './utils';
import Behavior from '../behavior';

const STORAGE_DB_DOC_ID = 'offers-signals';

/**
 * [v3.0] we will not use bucket anymore so now we will have the following
 *        data for each signal:
 * <pre>
 * {
 *    sig_id: {
 *      created_ts: (when the signal was created),
 *      modified_ts: (when was last modified),
 *      be_sync: true/false (defines if the signal was sent properly to the BE)
 *      data: {
 *        // the signal data
 *      }
 *    }
 *  }
 * </pre>
 *
 * additionally we will have types of signals that will be stored in different
 * containers. Each type of signal should be identified with a unique ID as well.
 *
 * @class SignalHandler
 */
export default class SignalHandler {
  /**
   * @constructor
   * @method constructor
   * @param {OffersDB} offersDB
   * @param {object|null} sender
   *   Interface to be use to sent messages, it will take:
   *   <pre>
   *   sender.httpPost args: (url, success_callback, data, onerror_callback, timeout)
   *   </pre>
   *   If not given, `httpdPost` is used.
   * @param {PatternsStat} patternsStat
   */
  constructor(offersDB, sender, patternsStat, journeySignals, getGID) {
    this.db = new SimpleDB(offersDB, logger, 'doc_data');
    this.sender = sender || { httpPost };
    this.patternsStat = patternsStat;
    this.journeySignals = journeySignals;
    this.getGID = getGID;
    this.sigMap = {}; // map from sig_type -> (sig_id -> sig_data)
    this.sigBuilder = {
      campaign: this._sigBuilderCampaign.bind(this),
      action: this._sigBuilderAction.bind(this),
    };
    this.sigsToSend = {};
    // a mapping (signalType, signalKey) to the number of retries - sending signals to backend
    // we don't want to retry sending a signal more than 3 times because of network error
    this.signalSendingRetries = {};
    this.dbDirty = false;
    this.signalsQueue = [];
    this.behavior = new Behavior();
  }

  async init() {
    await this._loadPersistenceData();
    await this.behavior.init();
    // set the interval timer method to send the signals
    this.sendIntervalTimer = null;
    this._startSendSignalsLoop(OffersConfigs.SIGNALS_OFFERS_FREQ_SECS);

    // save signals in a frequent way
    if (OffersConfigs.SIGNALS_LOAD_FROM_DB) {
      this.saveInterval = pacemaker.register(() => {
        if (this.dbDirty) {
          this._savePersistenceData();
        }
      },
      { timeout: OffersConfigs.SIGNALS_AUTOSAVE_FREQ_SECS * 1000 });
    }
  }

  _isMaximumNumRetriesReached(signalType, signalKey) {
    return (this.signalSendingRetries[[signalType, signalKey]] || 0) >= OffersConfigs.MAX_RETRIES;
  }

  _removeNumRetriesRecord(signalType, signalKey) {
    delete this.signalSendingRetries[[signalType, signalKey]];
  }

  _increaseNumRetriesRecord(signalType, signalKey) {
    this.signalSendingRetries[[signalType, signalKey]] = (
      this.signalSendingRetries[[signalType, signalKey]] || 0
    ) + 1;
  }

  // destructor
  async destroy() {
    // stop interval
    if (this.sendIntervalTimer) {
      this.sendIntervalTimer.stop();
    }

    if (this.saveInterval) {
      this.saveInterval.stop();
    }

    await this._savePersistenceData();
    this.getGID = null;
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
    const sigType = 'campaign';
    const sigInfo = this._getOrCreateSignal(sigType, cid);

    // now we update the data here
    const sigData = sigInfo.data;

    // check if we have the ucid
    sigData.ucid = sigData.ucid || generateUUID();
    sigData.offers = sigData.offers || {};
    const offers = sigData.offers;

    // get the offer
    offers[oid] = offers[oid] || {
      created_ts: Date.now(),
      origins: {}
    };
    const currOffer = offers[oid];

    const origins = currOffer.origins;
    origins[origID] = origins[origID] || {};
    const origin = origins[origID];

    // create or increment the given signal
    addOrCreate(origin, sid, count);

    // mark it as modified
    const shouldSend = !sid.startsWith('filter');
    this._markSignalAsModified(sigType, cid, shouldSend);

    logger.info(`setCampaignSignal${shouldSend ? '' : ' (silent)'}:`
      + `new signal added: ${cid} - ${oid} - ${origID} - ${sid} - +${count}`);

    this.patternsStat.reinterpretCampaignSignalAsync(cid, oid, sid);
    if (this.journeySignals) {
      this.journeySignals.reinterpretCampaignSignalAsync(sid);
    }

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
    // check if we have the entry
    if (this.sigMap.campaign && this.sigMap.campaign[cid]) {
      delete this.sigMap.campaign[cid];
      this.dbDirty = true;
      this._removeFromSigsToSend('campaign', cid);
    }
  }

  sendCampaignSignalNow(cid) {
    // we first need to try to send the signal
    return this._forceSignalDelivery('campaign', cid);
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

  //
  // The parameter `includeSilent=true` is used in tests only
  //
  async flush(includeSilent = false) {
    if (includeSilent) {
      Object.entries(this.sigMap).forEach(([sigType, container]) => {
        Object.keys(container).forEach((cid) => {
          this._markSignalAsModified(sigType, cid, true /* shouldSend */);
        });
      });
    }
    return this._sendSignalsToBE();
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
  _markSignalAsModified(sigType, sigKey, shouldSend = true) {
    // check if the container exists
    const sigInfo = this.sigMap[sigType][sigKey];
    sigInfo.modified_ts = Date.now();

    this.dbDirty = true;

    if (shouldSend) {
      sigInfo.be_sync = false;
      this._addSignalToBeSent(sigType, sigKey);
    }
  }

  _getOrCreateSignal(sigType, sigKey, initData = {}) {
    // check if the container exists
    this.sigMap[sigType] = this.sigMap[sigType] || {};
    const container = this.sigMap[sigType];

    // check if the sig exists for the given container
    container[sigKey] = container[sigKey] || this._createSignal(initData);
    return container[sigKey];
  }

  _getSignalInfo(sigType, sigKey) {
    return this.sigMap[sigType] && this.sigMap[sigType][sigKey];
  }

  _addSignalToBeSent(sigType, sigKey) {
    this.sigsToSend[sigType] = this.sigsToSend[sigType] || new Set();
    this.sigsToSend[sigType].add(sigKey);
  }

  sendSingle({ payload, signalType, sigID, numSignalsToSend }) {
    const telMonitorSignal = {
      type: 'offers_monitor',
      is_developer: isDeveloper(),
      batch_total: numSignalsToSend,
      msg_delivered: true,
    };
    logger.debug('Sending signal:', payload);
    return new Promise((resolve) => {
      this.sender.httpPost(
        OffersConfigs.SIGNALS_HPN_BE_ADDR,
        () => {
          if (signalType && sigID) {
            telemetry.push(telMonitorSignal);
            this._removeFromSigsToSend(signalType, sigID);
            this._removeNumRetriesRecord(signalType, sigID);
          }
          resolve();
        },
        payload,
        () => {
          if (signalType && sigID) {
            telMonitorSignal.msg_delivered = false;
            telemetry.push(telMonitorSignal);
            this._increaseNumRetriesRecord(signalType, sigID);
          }
          resolve();
        },
        1000 * 10
      );
    });
  }

  async sendBatch(batch) {
    if (batch.length > 0) {
      const signal = batch.pop();
      await this.sendSingle(signal);
      return this.sendBatch(batch);
    }
    return Promise.resolve();
  }

  async _getGID() {
    try {
      const gid = await this.getGID();
      return gid;
    } catch (e) {
      logger.warn(`anolysis getGID throws, ${e}`);
      return {};
    }
  }

  async _sendSignalsToBE(typeToSend, sigIDToSend) {
    if (this.sendSignalsPromise) {
      return this.sendSignalsPromise;
    }
    this.sendSignalsPromise = this._sendSignalsToBEunguarded(typeToSend, sigIDToSend);
    this.sendSignalsPromise.catch(() => {}).then(() => {
      this.sendSignalsPromise = null;
    });
    return this.sendSignalsPromise;
  }

  async _sendSignalsToBEunguarded(typeToSend, sigIDToSend) {
    const sigsKeysToSend = Object.keys(this.sigsToSend);
    const numSignalsToSend = sigsKeysToSend.length;
    const batch = [];
    const gid = await this._getGID();
    sigsKeysToSend.forEach((signalType) => {
      if (typeToSend && typeToSend !== signalType) {
        return;
      }
      this.sigsToSend[signalType].forEach((sigID) => {
        if ((sigIDToSend && sigIDToSend !== sigID)
          || this._isMaximumNumRetriesReached(signalType, sigID)) {
          return;
        }
        const sigInfo = this._getSignalInfo(signalType, sigID);
        if (!sigInfo || !sigInfo.data || sigInfo.be_sync) {
          return;
        }
        const sigDataToSend = this.sigBuilder[signalType](sigID, sigInfo);
        sigInfo.seq += 1;
        if (!sigDataToSend) { return; }
        const payload = JSON.stringify(constructSignal(sigID, signalType, sigDataToSend, gid));
        batch.push({ payload, signalType, sigID, numSignalsToSend });
      });
    });

    // Save signals before sending them
    //
    // It is possible that `destroy` will not be called or that browser
    // components including persistence are already destroyed before
    // calling the destructor. Then the signals would not be stored,
    // and on the next browser start, the old signals would be loaded.
    // The aggregated statistics and sequence would be reset to old values,
    // and the backend would get duplicate signals with wrong data.
    //
    // To prevent the confusion, synchronize the stored and sent signals.
    await this._savePersistenceData();

    // Now send the signals
    await this.sendBatch(batch);

    // Now send additional signals
    let behaviorBatch = await this.behavior.getSignals();
    behaviorBatch = behaviorBatch.map(payload =>
      ({ payload: JSON.stringify(constructSignal('behavior', payload.type, payload, gid)) }));

    const patternPromises = Array.from(
      this.patternsStat.getPatternSignals(),
      signalName => this.patternsStat.moveAll(signalName)
    );
    const patternBatches = await Promise.all(patternPromises);
    const patternBatch = [].concat(...patternBatches)
      .map(payload =>
        ({ payload: JSON.stringify(constructSignal('patterns-stats', payload.type, payload, gid)) }));

    const collectJourneyBatch = async () => {
      const journeys = await this.journeySignals.moveSignals();
      return journeys.map(payload =>
        ({ payload: JSON.stringify(constructSignal('journey', payload.type, payload)) }));
    };
    const journeyBatch = this.journeySignals ? await collectJourneyBatch() : [];

    await this.sendBatch([
      ...behaviorBatch,
      ...patternBatch,
      ...journeyBatch,
    ]);
    await this.behavior.clearSignals();
    return this.behavior.clearOldBehavior();
  }

  /**
   * this is just a temporary function that should be properly implemented
   * when refactoring this module using a queue instead of the current mechanisms
   */
  async _forceSignalDelivery(signalType, sigID) {
    return this._sendSignalsToBE(signalType, sigID);
  }

  _removeFromSigsToSend(signalType, signalID) {
    const sInfo = this._getSignalInfo(signalType, signalID);
    if (sInfo) {
      sInfo.be_sync = true;
    }

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
    this.sendIntervalTimer = pacemaker.register(() => {
      // here we need to process this particular bucket
      if (Object.keys(this.sigsToSend).length > 0) {
        this._sendSignalsToBE();
      }
    }, { timeout: timeToSendSecs * 1000 });
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
        })
        .then(() => {
          this.dbDirty = false;
          resolve(true);
        }));
  }

  // load persistence data
  _loadPersistenceData() {
    // for testing comment the following check
    if (!OffersConfigs.SIGNALS_LOAD_FROM_DB) {
      logger.info('Skipping loading persisted data (reason: config)');
      return Promise.resolve(true);
    }

    return this.db.get(STORAGE_DB_DOC_ID).then((docData) => {
      if (!docData || !docData.sig_map) {
        logger.log('No existing persisted data');
        return;
      }
      // set the data
      this.sigMap = docData.sig_map;

      // db is not dirty anymore
      this.dbDirty = false;

      // remove old signals and add all the keys that are not sync with the BE yet
      const currentTS = Date.now();
      Object.keys(this.sigMap).forEach((signalType) => {
        const container = this.sigMap[signalType];
        Object.keys(container).forEach((sigID) => {
          const sigData = this._getSignalInfo(signalType, sigID);
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
            this._addSignalToBeSent(signalType, sigID);
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
    const { uuid, actions } = sigData.data;
    return {
      o_id: sigKey,
      o_data: {
        seq: sigData.seq,
        created_ts: sigData.created_ts,
        uuid,
        actions,
      }
    };
  }

  onPurchase(msg) {
    return this.behavior.onPurchase(msg);
  }
}
