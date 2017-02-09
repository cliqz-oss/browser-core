/*
 * @brief Store all the information of the offers we need in this module
 */

import { utils } from 'core/cliqz';
import LoggingHandler from 'offers-v2/logging_handler';
import OffersConfigs from 'offers-v2/offers_configs';



////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'ui_offers_history';


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
var HistorySignalID = {
  // when the offer is displayed (not created)
  HSIG_OFFER_SHOWN:                 0,
  // when we got a timeout event
  HSIG_OFFER_TIMEOUT:               1,
  // when the user closed it
  HSIG_OFFER_CLOSED:                2,
  // when the offer is added
  HSIG_OFFER_ADDED:                 3,

};


////////////////////////////////////////////////////////////////////////////////
export class UIOffersHistory {

  //
  constructor() {
    this.offersHistory = {};

    // check if we need to clear
    if (OffersConfigs.CLEAR_OFFERS_HISTORY_DATA) {
      this._clearPersistenceData();
    }

    this._loadPersistenceData();

    linfo('constructor: offers history: ' + JSON.stringify(this.offersHistory));

    // #GR-278: we will load old data
    try {
      this._removeOldEntries();
      linfo('_removeOldEntries properly executed');
    } catch(error) {
      lerr('_removeOldEntries: Error happened when removing the old entries: ' + error);
    }
  }

  destroy() {
    this._savePersistenceData();
  }

  savePersistenceData() {
    this._savePersistenceData();
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                API
  //////////////////////////////////////////////////////////////////////////////

  //
  // @brief increase the counter of a history signal
  //
  incHistorySignal(elementID, historySignal) {
    linfo('incHistorySignal: adding history sig in offer: ' + elementID + ' - sig: ' + historySignal);
    if (!elementID || historySignal === undefined || historySignal === null) {
      lerr('incHistorySignal: elementID or historySignal null: ' + elementID + ' - ' + historySignal);
      return;
    }
    var offerData = this.offersHistory[elementID];
    if (!offerData) {
      offerData = this.offersHistory[elementID] = this._createNewOfferData();
    }
    var signalData = offerData[historySignal];
    if (!signalData) {
      lerr('incHistorySignal: the signal ' + historySignal + ' is not here yet, creating it');
      signalData = this._createNewSignalField();
    }

    // increase
    signalData.c += 1;
    signalData.last_ts = Date.now();
    offerData[historySignal] = signalData;
  }

  // return a history signal value or null if not found
  getHistorySignal(elementID, historySignal) {
    if (!elementID || historySignal === undefined || historySignal === null) {
      lerr('getHistorySignal: elementID or historySignal null');
      return null;
    }
    var offerData = this.offersHistory[elementID];
    if (!offerData) {
      return null
    }
    var signalData = offerData[historySignal];
    if (!signalData) {
      lerr('getHistorySignal: the signal ' + historySignal + ' is not valid?');
      return null;
    }
    return signalData.c;
  }

  // get the last time a history signal was stored ?
  getLastUpdateOf(elementID, historySignal) {
    if (!elementID || historySignal === undefined || historySignal === null) {
      lerr('getLastUpdateOf: elementID or historySignal null');
      return null;
    }
    var offerData = this.offersHistory[elementID];
    if (!offerData) {
      return null
    }
    var signalData = offerData[historySignal];
    if (!signalData) {
      lerr('getLastUpdateOf: the signal ' + historySignal + ' is not valid?');
      return null;
    }
    return signalData.last_ts;
  }

  // returns the TS when the offer was created (for the first time)
  // returns null otherwise
  getCreationTime(elementID) {
    const offerData = this.offersHistory[elementID];
    if (!offerData) {
      lwarn('getCreationTime: there is no offer associated with offer id: ' + elementID);
      return null;
    }
    return offerData.creation_ts;
  }

  hasHistoryForOffer(elementID) {
    return this.offersHistory[elementID] !== undefined;
  }

  // add / get an attribute for a particular offer
  //
  addElementAttribute(elementID, attrName, attrData) {
    linfo('addElementAttribute: adding attribute in offer: ' + elementID + ' - attr: ' + attrName);
    if (!elementID || attrName === undefined || attrName === null) {
      lerr('addElementAttribute: elementID or attrName null: ' + elementID + ' - ' + attrName);
      return;
    }
    var offerData = this.offersHistory[elementID];
    if (!offerData) {
      offerData = this.offersHistory[elementID] = this._createNewOfferData();
    }

    // set it
    if (!offerData.attrs) {
      offerData.attrs = {};
    }

    offerData.attrs[attrName] = attrData;
  }

  getElementAttribute(elementID, attrName) {
    const offerData = this.offersHistory[elementID];
    if (!offerData || !offerData.attrs) {
      lwarn('getElementAttribute: there is no offer or attrs associated with offer id: ' + elementID);
      return null;
    }
    return offerData.attrs[attrName];
  }



  //////////////////////////////////////////////////////////////////////////////
  //                            PRIVATE METHODS
  //////////////////////////////////////////////////////////////////////////////

  _createNewSignalField() {
    return {
        // counter of this value
        c: 0,
        // last update timestamp
        last_ts: null,
      };
  }

  // create the data for a particular offer
  _createNewOfferData() {
    // default values
    var data = {
      creation_ts: Date.now(),
      attrs: {}
    };
    for (var k in HistorySignalID) {
      if (!HistorySignalID.hasOwnProperty(k)) {
        continue;
      }
      const val = HistorySignalID[k];
      data[val] = this._createNewSignalField();
    }

    return data;
  }

  // load the persistence data
  _loadPersistenceData() {
    if (!OffersConfigs.LOAD_OFFERS_HISTORY_DATA) {
      linfo('_loadPersistenceData: skipping the load of history data');
      return;
    }

    var localStorage = utils.getLocalStorage(OffersConfigs.OFFERS_HISTORY_DATA);

    var cache = localStorage.getItem('offers_history');
    if (cache) {
      this.offersHistory = JSON.parse(cache);
      linfo('_loadPersistenceData: offersHistory loaded from file');
    } else {
      linfo('_loadPersistenceData: offersHistory NOT FOUND ON THE HD yet.');
    }
  }

  _savePersistenceData() {
    if (!OffersConfigs.LOAD_OFFERS_HISTORY_DATA) {
      linfo('_savePersistenceData: skipping the saving of history data');
      return;
    }
    try {
      var localStorage = utils.getLocalStorage(OffersConfigs.OFFERS_HISTORY_DATA);
      if (localStorage) {
        localStorage.setItem('offers_history', JSON.stringify(this.offersHistory));
        linfo('_savePersistenceData: saving the offers history here');
      } else {
        lwarn('_savePersistenceData: no local storage found?');
      }
    } catch(ee) {
      lerr('_savePersistenceData: error storing data: ' + ee + '. At place: ' + OffersConfigs.OFFERS_HISTORY_DATA);
    }
  }

  // wil remove all the data on the machine
  //
  _clearPersistenceData() {
    linfo('_clearPersistenceData: clearing saved history');
    try {
      var localStorage = utils.getLocalStorage(OffersConfigs.OFFERS_HISTORY_DATA);
      if (localStorage) {
        localStorage.setItem('offers_history', JSON.stringify({}));
        linfo('_clearPersistenceData: done');
      } else {
        lwarn('_clearPersistenceData: no local storage found?');
      }
    } catch(ee) {
      lerr('_clearPersistenceData: error clearing data: ' + ee + '. At place: ' + OffersConfigs.OFFERS_HISTORY_DATA);
    }
  }


  //
  // @brief will iterate over all the entries of the data and will remove
  //        all of them that are older than a given time
  //
  _removeOldEntries() {
    const sigDeltaLiveTimeMs = Date.now() - OffersConfigs.OFFERS_HISTORY_LIVE_TIME_SECS * 1000;
    Object.keys(this.offersHistory).forEach((elemID) => {
      const creationTimeMs = this.getCreationTime(elemID);
      if (creationTimeMs && creationTimeMs >= sigDeltaLiveTimeMs) {
        linfo('_removeOldEntries: removing entry with ID: ' + elemID);
        delete this.offersHistory[elemID];
      }
    });
  }
};

export default HistorySignalID;

