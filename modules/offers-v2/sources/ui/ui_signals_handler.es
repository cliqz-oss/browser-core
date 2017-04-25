/*
 * @brief We will use this module to handle all the signals we want to send to the
 *        backend related with the ui
 */

import LoggingHandler from '../logging_handler';
import OffersConfigs from '../offers_configs';


////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'ui_signals_handler';

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
// Track Signal IDs

var TrackSignalID = {
  TSIG_OFFER_SHOWN:                 'offer_shown',
  TSIG_OFFER_HIDE:                  'offer_hide',
  TSIG_OFFER_TIMEOUT:               'offer_timeout',
  TSIG_OFFER_CLOSED:                'offer_closed',
  TSIG_OFFER_MORE_INFO:             'offer_more_info',
  TSIG_OFFER_MORE_ABT_CLIQZ:        'offer_more_cliqz',
  TSIG_OFFER_CALL_TO_ACTION:        'offer_ca_action',
  TSIG_OFFER_ADDED:                 'offer_added',
};


////////////////////////////////////////////////////////////////////////////////
// Helper methods
//
function addOrCreate(d, field, value) {
  const elem = d[field];
  if (elem) {
    d[field] = elem + value;
  } else {
    d[field] = value;
  }
}


////////////////////////////////////////////////////////////////////////////////
export class UISignalsHandler {

  //
  constructor(sigHandler) {
    this.sigHandler = sigHandler;
  }

  destroy() {
    // ...
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                API
  //////////////////////////////////////////////////////////////////////////////

  //
  // @brief this will track a new signal coming from an offer.
  //
  trackOfferSignal(offerID, signalKey) {
    if (!offerID || !signalKey) {
      lwarn('trackOfferSignal: the offerID or signalKey are null?');
      return;
    }
    // get the offer related info
    var offerSigInfo = this.sigHandler.getSignalData(offerID);
    if (!offerSigInfo) {
      offerSigInfo = this._createOfferSignalData();
    }

    // merge (update) signal
    addOrCreate(offerSigInfo, signalKey, 1);

    // set it back to the sig handler
    this.sigHandler.setSignalData(offerID, offerSigInfo);
  }

  //
  // @brief this will set an attribute to an offer id, like offer_source
  //
  setOfferAttribute(offerID, attrName, attrValue) {
    if (!offerID || !attrName) {
      lwarn('setOfferAttribute: the offerID or attrName are null?');
      return;
    }
    // get the offer related info
    var offerSigInfo = this.sigHandler.getSignalData(offerID);
    if (!offerSigInfo) {
      offerSigInfo = this._createOfferSignalData();
    }

    // set attribute
    offerSigInfo[attrName] = attrValue;

    // set it back to the sig handler
    this.sigHandler.setSignalData(offerID, offerSigInfo);
  }


  //////////////////////////////////////////////////////////////////////////////
  //                            PRIVATE METHODS
  //////////////////////////////////////////////////////////////////////////////

  // create a new offer data signal to be sent (skeleton).
  _createOfferSignalData() {
    // TODO: put the data we need here, maybe when we created this?
    return {
      created_ts: Date.now()
    };
  }


};



export default TrackSignalID;



