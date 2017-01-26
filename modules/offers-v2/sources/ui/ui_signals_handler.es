/*
 * @brief We will use this module to handle all the signals we want to send to the
 *        backend related with the ui
 */

import LoggingHandler from 'offers-v2/logging_handler';
import OffersConfigs from 'offers-v2/offers_configs';


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

    // check if we have the associated bucket, if not we create one
    var bucketInfo = this.sigHandler.getBucketInfo(OffersConfigs.SIGNALS_OFFERS_BUCKET_NAME);
    if (!bucketInfo) {
      linfo('creating a new bucket ' + OffersConfigs.SIGNALS_OFFERS_BUCKET_NAME);
      const config = {
        tts_secs: OffersConfigs.SIGNALS_OFFERS_FREQ_SECS,
      }
      if (!this.sigHandler.createBucket(OffersConfigs.SIGNALS_OFFERS_BUCKET_NAME, config)) {
        lerr('we couldnt create the bucket, something happened...');
        // TODO: handle error here?
      }
    }
    // TODO: check if we need to update the bucket (remove old and create a new one)
    //       this may delete all the current data => create a method to update
    //       the configuration of the bucket only then.

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
    var offerSigInfo = this.sigHandler.getSignal(OffersConfigs.SIGNALS_OFFERS_BUCKET_NAME, offerID);
    if (!offerSigInfo) {
      offerSigInfo = this._createOfferSignalData();
    }

    // merge (update) signal
    addOrCreate(offerSigInfo, signalKey, 1);

    // set it back to the sig handler
    this.sigHandler.addSignal(OffersConfigs.SIGNALS_OFFERS_BUCKET_NAME, offerID, offerSigInfo);
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
    var offerSigInfo = this.sigHandler.getSignal(OffersConfigs.SIGNALS_OFFERS_BUCKET_NAME, offerID);
    if (!offerSigInfo) {
      offerSigInfo = this._createOfferSignalData();
    }

    // set attribute
    offerSigInfo[attrName] = attrValue;

    // set it back to the sig handler
    this.sigHandler.addSignal(OffersConfigs.SIGNALS_OFFERS_BUCKET_NAME, offerID, offerSigInfo);
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



