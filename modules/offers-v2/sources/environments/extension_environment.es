import LoggingHandler from 'offers-v2/logging_handler';
import EmptyEnvironment from './empty_environment'
import OffersConfigs from 'offers-v2/offers_configs';
import HistorySignalID from 'offers-v2/ui/ui_offers_history';


const MODULE_NAME = 'extension_environment';

export default class ExtensionEnvironment extends EmptyEnvironment {

  queryHistory(start, end) {
    return new Error('unimplemented #queryHistory');
  }

  sendApiRequest(endpoint, params) {
    var self = this;

    self.info("ExtensionEnvironment", "sendApiRequest called");

    return new Promise((resolve, reject) => {
      var pairs = [];
      for(var prop in params) {
        pairs.push(prop + '=' + encodeURIComponent(params[prop]));
      }

      var query = '';
      if(pairs.length > 0) {
        query = '?' + pairs.join('&');
      }

      var url = OffersConfigs.BACKEND_URL + "/api/v1/" + endpoint + query;
      self.info("ExtensionEnvironment", "url called: " + url);

      var req = new XMLHttpRequest();
      req.overrideMimeType("application/json");
      req.open('POST', url);
      req.onload = function() {
        if(req.status == 200) {
          resolve(JSON.parse(req.response));
        }
        else {
          reject('Status code ' + req.status + ' for ' + url + this.statusText);
        }
      };
      req.onerror = function () {
        reject('Error loading ' + url + ': ' + this.statusText);
      };
      req.ontimeout = function(){
        reject('Timeout loading ' + url);
      };

      req.send();
    });
  }

  info(mod, msg) {
    LoggingHandler.LOG_ENABLED && LoggingHandler.info(mod, msg);
  }

  error(mod, msg) {
    if(LoggingHandler.LOG_ENABLED) {
      LoggingHandler.error(mod, msg);
      if(msg && msg.stack) {
        LoggingHandler.error(mod, msg.stack);
      }
    }
  }

  warning(mod, msg) {
    LoggingHandler.LOG_ENABLED && LoggingHandler.warning(mod, msg);
  }

  addRuleInfoForOffer(offerId, ruleInfo) {
    this.uiOfferProcessor.addRuleInfoForOffer(offerId, ruleInfo);
  }

  addOffer(offerInfo) {
    this.uiOfferProcessor.addOffer(offerInfo);
  }

  removeOffer(offerId) {
    this.uiOfferProcessor.removeOffer(offerId);
  }

  hasOffer(offerId) {
    return this.uiOfferProcessor.hasOffer(offerId);
  }

  getOfferLastUpdate(offerId, signal) {
    var offerProc = this.uiOfferProcessor;

    if(!offerProc.offersHistory) {
      return null;
    }

    var signalId;
    if(signal === 'offer-added') {
      signalId = HistorySignalID.HSIG_OFFER_ADDED
    }
    else {
      return null;
    }

    return offerProc.offersHistory.getLastUpdateOf(offerId, signalId);
  }


  sendSignal(signalId, key) {
    function addOrCreate(d, field, value) {
      const elem = d[field];
      if (elem) {
        d[field] = elem + value;
      } else {
        d[field] = value;
      }
    }

    // check if we have the associated bucket, if not we create one
    var bucketInfo = this.signalHandler.getBucketInfo(OffersConfigs.SIGNALS_TRIGGERS_BUCKET_NAME);
    if (!bucketInfo) {
      const config = {
        tts_secs: OffersConfigs.SIGNALS_OFFERS_FREQ_SECS,
      }
      if (!this.signalHandler.createBucket(OffersConfigs.SIGNALS_TRIGGERS_BUCKET_NAME, config)) {
        // TODO: handle error here?
        return;
      }
    }
    // TODO: check if we need to update the bucket (remove old and create a new one)
    //       this may delete all the current data => create a method to update
    //       the configuration of the bucket only then.

    if (!signalId || !key) {
      return;
    }
    // get the offer related info
    var signal = this.signalHandler.getSignal(OffersConfigs.SIGNALS_TRIGGERS_BUCKET_NAME, signalId);
    if (!signal) {
      signal = {};
    }

    // merge (update) signal
    addOrCreate(signal, key, 1);

    // set it back to the sig handler
    this.signalHandler.addSignal(OffersConfigs.SIGNALS_TRIGGERS_BUCKET_NAME, signalId, signal);
  }
}
