/*
 * @brief We will use this module to handle all the signals we want to send to the
 *        backend related with the ui
 */

import LoggingHandler from '../logging_handler';
import OffersConfigs from '../offers_configs';
import random from '../../core/crypto/random';


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
  trackOfferSignal(campaignID, offerID, signalKey) {
    if (!campaignID || !offerID || !signalKey) {
      lwarn('trackOfferSignal: the campaignID, offerID or signalKey are null?');
      return;
    }

    // get the offer related info
    var campaignSigInfo = this.sigHandler.getSignalData(campaignID);
    if (!campaignSigInfo) {
      campaignSigInfo = this._createCampaignSignalData();
    }

    var offerSigInfo = campaignSigInfo.offers[offerID];
    if(!offerSigInfo) {
      offerSigInfo = this._createOfferSignalData();
      campaignSigInfo.offers[offerID] = offerSigInfo;
    }

    // merge (update) signal
    addOrCreate(offerSigInfo, signalKey, 1);

    // set it back to the sig handler
    this.sigHandler.setSignalData(campaignID, campaignSigInfo);
  }

  //
  // @brief this will set an attribute to an offer id, like offer_source
  //
  setOfferAttribute(campaignID, offerID, attrName, attrValue) {
    if (!campaignID || !offerID) {
      lwarn('setOfferAttribute: the campaignID or offerID are null?');
      return;
    }

    // get the offer related info
    var campaignSigInfo = this.sigHandler.getSignalData(campaignID);
    if (!campaignSigInfo) {
      campaignSigInfo = this._createCampaignSignalData();
    }

    var offerSigInfo = campaignSigInfo[offerID];
    if(!offerSigInfo) {
      offerSigInfo = this._createOfferSignalData();
      campaignSigInfo[offerID] = offerSigInfo;
    }

    // set attribute
    offerSigInfo[attrName] = attrValue;

    // set it back to the sig handler
    this.sigHandler.setSignalData(campaignID, campaignSigInfo);
  }


  //////////////////////////////////////////////////////////////////////////////
  //                            PRIVATE METHODS
  //////////////////////////////////////////////////////////////////////////////

  // create a new offer data signal to be sent (skeleton).
  _createCampaignSignalData() {
    var self = this;

    // TODO: put the data we need here, maybe when we created this?
    return {
      created_ts: Date.now(),
      ucid: self._uuid(),
      offers: {}
    };
  }

  // create a new offer data signal to be sent (skeleton).
  _createOfferSignalData() {
    // TODO: put the data we need here, maybe when we created this?
    return {
      created_ts: Date.now()
    };
  }

  _uuid() {
    function s4() {
      return Math.floor((1 + random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }
};



export default TrackSignalID;



