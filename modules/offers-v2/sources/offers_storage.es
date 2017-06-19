/*
 * This module will store offers and control the lifetime of them as well
 * as show them on the future.
 * check #GR-300 for more info
 */

import { events } from '../core/cliqz';
import LoggingHandler from './logging_handler';
import OffersConfigs from './offers_configs';
import DBHelper from './db_helper';
import { openNewTabAndSelect } from './utils';
import TrackSignalID from './signals_defs';
import HistorySignalID from './ui/ui_offers_history';

// consts

const MODULE_NAME = 'offers_storage';
const STORAGE_DB_DOC_ID = 'offers-storage';


// TODO: remove this methods
function linfo(msg) {
  if (LoggingHandler.LOG_ENABLED) {
    LoggingHandler.info(MODULE_NAME, msg);
  }
}
function lwarn(msg) {
  if (LoggingHandler.LOG_ENABLED) {
    LoggingHandler.warning(MODULE_NAME, msg);
  }
}
function lerr(msg) {
  if (LoggingHandler.LOG_ENABLED) {
    LoggingHandler.error(MODULE_NAME, msg);
  }
}

// Events we will emit

const OffersStorageEvt = {
  // when the list of offers has changed (loaded / removed a couple of them)
  OSE_OFFERS_LIST_CHANGED: 'offers-list-changed',
  // when a new offer is added into the storage
  OSE_NEW_OFFER: 'new-offer-added',
  // when an offer is removed from the storage
  OSE_OFFER_REMOVED: 'offer-removed',
  // when an offer status changed on the storage
  OSE_OFFER_ST_CHANGED: 'offer-status-changed',
};

/**
 * OffersStorage class
 */
class OffersStorage {

  //
  constructor(offersHistory, sigHandler, offersDB) {
    this.offersHistory = offersHistory;
    this.sigHandler = sigHandler;
    this.db = new DBHelper(offersDB);

    // offer id -> offerData container
    this.offersStorageMap = {};
    // the actions to perform when an ui event is performed on any of the offers
    // note that this is not exactly the same than for the offer being displayed
    // on the offer processor
    this.uiActionsMap = {
      'call-to-action': this._uiFunCallToAction.bind(this),
      'more-about-cliqz': this._uiFunMoreAboutCliqz.bind(this),
      'close-offer': this._uiFunCloseOffer.bind(this),
      'more-about-offer': this._uiFunMoreAboutOffer.bind(this),
      'offers-state-changed': this._uiFunOfferStateChanged.bind(this),
      'action-signal': this._uiFunActionSignal.bind(this),
      'offer-action-signal': this._uiFunOfferActionSignal.bind(this)
    };

    // load and clean
    this._loadPersistentData();
  }

  destroy() {
    this.savePersistentData();
  }

  savePersistentData() {
    this._savePersistentData();
  }

  //
  //                                API
  //

  //
  // check if an offer exists on the storage
  //
  hasOffer(offerID) {
    return this.offersStorageMap[offerID];
  }

  //
  // @brief add a new offer and extra information
  // @param offerID is the id of the offer we are adding
  // @param offerData is a object containing:
  // {
  //   offer_info: {},   // the information of the offer coming from BE.
  //   tts: N,           // the number of seconds that we need to store this
  //                     // offer since we add it to the storage.
  //                     // so will be expired: created_ts + tts
  // }
  //
  addOffer(offerID, offerData) {
    linfo(`addOffer: adding offer with ID ${offerID}`);

    if (!offerID || !offerData || !offerData.offer_info || !offerData.tts) {
      lwarn('addOffer: invalid args?');
      return false;
    }
    // check if exists
    if (this.hasOffer(offerID)) {
      lwarn(`addOffer: the offer with ID ${offerID} already exists.`);
      return false;
    }

    // create new entry container
    const offerInfoCpy = JSON.parse(JSON.stringify(offerData.offer_info));
    const newContainer = this._createOfferContainer(offerInfoCpy, offerData.tts);
    if (!newContainer) {
      lerr('addOffer: something happened when creating the container..');
      return false;
    }

    this.offersStorageMap[offerID] = newContainer;

    // emit event
    this._emitEvent(OffersStorageEvt.OSE_NEW_OFFER,
                    { offer_id: offerID, offer_data: offerData });

    // track the signal
    // this.sigHandler.setCampaignSignal(offerInfoCpy.campaign_id,
    //                                   offerID,
    //                                   this.originName,
    //                                   TrackSignalID.TSIG_OFFER_STG_ADDED);

    // update DB
    // TODO: IMPROVEMENT:
    //       should we do a more performant method to store the data here? like
    //       mark it as dirty and every N seconds we check if we should save it
    //       or not? Makes sense?
    this._savePersistentData();

    return true;
  }

  //
  // remove an offer from the storage.
  //
  removeOffer(offerID) {
    if (!offerID || !this.hasOffer(offerID)) {
      lwarn('removeOffer: the offerID is invalid or we dont have any offer to remove with that id');
      return false;
    }

    // emit an event
    this._emitEvent(OffersStorageEvt.OSE_OFFER_REMOVED, { offer_id: offerID });

    // track the signal
    // const campaignID = this._getCampaignIDFromOfferID(offerID);
    // this.sigHandler.setCampaignSignal(campaignID,
    //                                   offerID,
    //                                   this.originName,
    //                                   TrackSignalID.TSIG_OFFER_STG_REMOVED);

    // remove it
    delete this.offersStorageMap[offerID];

    // TODO: IMPROVEMENT:
    //       should we do a more performant method to store the data here? like
    //       mark it as dirty and every N seconds we check if we should save it
    //       or not? Makes sense?
    // this._savePersistentData();

    return true;
  }

  //
  // retrieve the offers information list, each of the elements on the list
  // will be as follow:
  // {
  //   offer_id: offerID,
  //   offer_info: information of the offer (),
  //   created_ts: when the offer was created,
  //   expire_ts: expire timestamp
  // }
  //
  getAllOffers() {
    const result = [];
    const self = this;
    Object.keys(this.offersStorageMap).forEach((offerID) => {
      const containerData = self.offersStorageMap[offerID];
      result.push({
        offer_id: offerID,
        offer_info: containerData.offer_info,
        created_ts: containerData.created_ts,
        expire_ts: containerData.expire_ts,
        state: containerData.state,
      });
    });
    return result;
  }

  //
  // @brief this method should be called by the associated UI interface whenever
  //        a new UI event happened (for example, an offer is closed / removed, or
  //        clicked, or whatever we want to track).
  // @param event:
  // {
  //   origin:    The id name to identify the ui (for example offers-storage-btn
  //              or any other id).
  //   offer_id:  The offer related on the ui event.
  //   type:  The event type (button-clicked?)
  //   data:  Extra arguments if needed (like button id...).
  // }
  //
  onStorageOffersUIEvent(evt) {
    // TODO:
    // - we need to define if we will track the signals here or in the processor
    //   take into account that if we open an offer here the code to open it or
    //   act acording to what the offer is will be duplicated on the offer processor
    //   and here?
    // - some of the signals will be here

    linfo(`onStorageOffersUIEvent: a new UI event happened for offerID: ${evt.offer_id} and eventType: ${evt.type}`);

    // check if we have the offer
    if ((evt.offer_id !== null && evt.offer_id !== undefined) &&
        !this.hasOffer(evt.offer_id)) {
      lwarn(`onStorageOffersUIEvent: the offer with ID ${evt.offer_id} is not on the ` +
            'offers storage?');
      return;
    }

    // depending on the event type we call the associated action
    const actionFun = this.uiActionsMap[evt.type];
    if (!actionFun) {
      lwarn(`onStorageOffersUIEvent: The function to handle the event type ${evt.type}` +
            ' is undefined?');
      return;
    }
    // call the method and process the event
    actionFun({ offerID: evt.offer_id, data: evt.data, origin: evt.origin });
  }


  //
  //                            PRIVATE METHODS
  //

  //
  // create a new element containing the information of an offer
  // @param offerInfo will be the offer information we got from the BE
  // @param tts is the time to store on storage a particular offer (absolute ts)
  // all offers are pushed with STATE: new. In this way we can recognize which have been read
  //
  _createOfferContainer(offerInfo, tts) {
    if (!offerInfo) {
      lwarn('_createOfferContainer: offer data is null? nothing to do here');
      return null;
    }
    const expireTimestamp = Date.now() + (tts * 1000);
    return {
      offer_info: offerInfo,
      created_ts: Date.now(),
      expire_ts: expireTimestamp,
      state: 'new'
    };
  }

  //
  // emit an event to the subscribers
  //
  _emitEvent(eventID, evtData) {
    // for now we will just emit an event on the same channel and provide the
    // type as attribute
    linfo(`_emitEvent: emitting new event: ${eventID}`);
    events.pub('offers-storage:new_event', { event_id: eventID, data: evtData });
  }

  //
  // load / save persistent data
  //
  _loadPersistentData() {
    if (!OffersConfigs.LOAD_OFFERS_STORAGE_DATA) {
      linfo('_loadPersistenceData: skipping the load of storage data');
      return;
    }
    const self = this;
    this.db.getDocData(STORAGE_DB_DOC_ID).then((docData) => {
      if (!docData || !docData.offersStorageMap) {
        lerr('_loadPersistenceData: something went wrong loading the data?');
        return;
      }
      // set the data
      self.offersStorageMap = docData.offersStorageMap;

      // remove the old ones
      self._removeExpiredOffers();

      self._emitEvent(OffersStorageEvt.OSE_OFFERS_LIST_CHANGED, {});
    }).catch((err) => {
      lerr(`_loadPersistenceData: error loading the storage data...: ${JSON.stringify(err)}`);
    });
  }
  _savePersistentData() {
    if (!OffersConfigs.LOAD_OFFERS_STORAGE_DATA) {
      linfo('_loadPersistenceData: skipping the load of storage data');
      return;
    }
    this.db.saveDocData(STORAGE_DB_DOC_ID,
      {
        offersStorageMap: this.offersStorageMap
      }
      );
  }

  //
  // check and remove old entries on the current map
  //
  _removeExpiredOffers() {
    if (!this.offersStorageMap) {
      return;
    }

    const currentTS = Date.now();
    const self = this;
    Object.keys(this.offersStorageMap).forEach((offerID) => {
      const containerData = self.offersStorageMap[offerID];
      if (containerData.expire_ts < currentTS) {
        linfo(`_removeExpiredOffers: offer ${offerID} expired!`);
        self.removeOffer(offerID);
      }
    });
  }

  //
  // return the display id from an offer id
  //
  _getDisplayIDFromOfferID(offerID) {
    const offerInfo = this.offersStorageMap[offerID];
    if (!offerInfo) {
      return null;
    }
    return offerInfo.offer_info.display_id;
  }

  //
  // return the campaign id from an offer id
  //
  _getCampaignIDFromOfferID(offerID) {
    const offerInfo = this.offersStorageMap[offerID];
    if (!offerInfo) {
      return null;
    }
    return offerInfo.offer_info.campaign_id;
  }


  //
  // actions from ui

  _uiFunCallToAction({ offerID, origin }) {
    const offerInfoContainer = this.offersStorageMap[offerID];
    if (!offerInfoContainer) {
      lwarn(`_uiFunCallToAction: we dont have an offer on the storage with id: ${offerID}`);
      return;
    }

    const campaignID = this._getCampaignIDFromOfferID(offerID);
    this.sigHandler.setCampaignSignal(campaignID,
                                      offerID,
                                      origin,
                                      TrackSignalID.TSIG_OFFER_CALL_TO_ACTION);

    //
    // TODO: for now we will just open the link. in the future we need to check
    //       against the backend and see if the offer is still valid and more
    //
    // execute the action if we have one
    const offerInfo = offerInfoContainer.offer_info;
    if (offerInfo.action_info && offerInfo.action_info.on_click) {
      openNewTabAndSelect(offerInfo.action_info.on_click);
    } else {
      linfo('_uiFunCallToAction: no action_info defined for this offer');
    }
  }

  _uiFunMoreAboutCliqz({ offerID, origin }) {
    const offerInfoContainer = this.offersStorageMap[offerID];
    if (!offerInfoContainer) {
      lwarn(`_uiFunMoreAboutCliqz: we dont have an offer on the storage with id: ${offerID}`);
      return;
    }
    // TODO: track here and open the new tab maybe?
    const campaignID = this._getCampaignIDFromOfferID(offerID);
    this.sigHandler.setCampaignSignal(campaignID,
                                      offerID,
                                      origin,
                                      TrackSignalID.TSIG_OFFER_MORE_INFO);
    openNewTabAndSelect(OffersConfigs.OFFER_INFORMATION_URL);
  }

  _uiFunCloseOffer({ offerID, origin }) {
    const offerInfoContainer = this.offersStorageMap[offerID];
    if (!offerInfoContainer) {
      lwarn(`_uiFunCloseOffer: we dont have an offer on the storage with id: ${offerID}`);
      return;
    }
    const campaignID = this._getCampaignIDFromOfferID(offerID);
    this.sigHandler.setCampaignSignal(campaignID,
                                      offerID,
                                      origin,
                                      TrackSignalID.TSIG_OFFER_CLOSED);
    const displayID = this._getDisplayIDFromOfferID(offerID);
    this.offersHistory.incHistorySignal(displayID, HistorySignalID.HSIG_OFFER_CLOSED);
    // Should we just take one of them?
    this.offersHistory.incHistorySignal(offerID, HistorySignalID.HSIG_OFFER_CLOSED);

    // we just remove the offer from the storage, maybe we want to do some
    // other checks here
    this.removeOffer(offerID);
  }

  _uiFunMoreAboutOffer({ offerID, origin }) {
    const offerInfoContainer = this.offersStorageMap[offerID];
    if (!offerInfoContainer) {
      lwarn(`_uiFunMoreAboutOffer: we dont have an offer on the storage with id: ${offerID}`);
      return;
    }

    const campaignID = this._getCampaignIDFromOfferID(offerID);
    this.sigHandler.setCampaignSignal(campaignID,
                                      offerID,
                                      origin,
                                      TrackSignalID.TSIG_OFFER_MORE_ABT_CLIQZ);
  }

  //
  // @brief This method will take as data the following info:
  // {
  //   'offers_ids': [id1, ...], // the list of offers ids we want to change the state
  //   'new_state': 'old', // the new state to set to the offers on the given list
  // }
  //
  _uiFunOfferStateChanged({ offerID, data }) {
    if (!data || !data.offers_ids || !data.new_state) {
      lwarn(`_uiFunOfferStateChanged: invalid arguments: ${JSON.stringify(data)}`);
      return;
    }

    // for each of the offers we now set the new state
    let somethingModified = false;
    const self = this;
    data.offers_ids.forEach((oid) => {
      const offerInfoContainer = self.offersStorageMap[oid];
      if (!offerInfoContainer) {
        lwarn(`uiFunOfferStateChanged: we dont have an offer on the storage with id: ${offerID}`);
        return;
      }
      offerInfoContainer.state = data.new_state;
      somethingModified = true;
    });

    // save the DB
    if (somethingModified) {
      this._savePersistentData();
    }

    // trigger an event to all the other uis?, for now not
    // this._emitEvent(OffersStorageEvt.OSE_OFFER_ST_CHANGED, data);
  }

  /**
   * Record signals that are not related to a campaign or offer.
   * @param  {[type]} options.data    [description]
   * @param  {[type]} options.origin  [description]
   * @return {[type]}                 [description]
   */
  _uiFunActionSignal({ data, origin }) {
    if (!data || !data.action_id || !origin) {
      lwarn(`_uiFunActionSignal: data: ${data} or origin: ${origin} are invalid`);
      return;
    }
    // we will send the new signal here depending on the action id:
    this.sigHandler.setActionSignal(data.action_id, origin);
  }

  /**
   * This method will track all the action signals that are related to an offer
   * but doesn't modify the logic of the core or anything, just for information.
   * @param  {[type]} options.offerID [description]
   * @param  {[type]} options.data    [description]
   * @param  {[type]} options.origin  [description]
   * @return {[type]}                 [description]
   */
  _uiFunOfferActionSignal({ offerID, data, origin }) {
    const offerInfoContainer = this.offersStorageMap[offerID];
    if (!data || !data.action_id || !offerInfoContainer) {
      lwarn(`_uiFunOfferActionSignal: invalid args: ${offerID} - ${JSON.stringify(data)}`);
      return;
    }

    // we track it here
    const campaignID = this._getCampaignIDFromOfferID(offerID);
    this.sigHandler.setCampaignSignal(campaignID,
                                      offerID,
                                      origin,
                                      data.action_id);
  }


}

export default OffersStorage;

