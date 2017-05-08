import LoggingHandler from '../logging_handler';
import EmptyEnvironment from './empty_environment'
import OffersConfigs from '../offers_configs';
import HistorySignalID from '../ui/ui_offers_history';
import random from '../../core/crypto/random';

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
    if (this.uiOfferProcessor) {
      return this.uiOfferProcessor.hasOffer(offerId);
    } else {
      return false;
    }
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


  sendSignal(campaignId, offerId, key) {
    function addOrCreate(d, field, value) {
      const elem = d[field];
      if (elem) {
        d[field] = elem + value;
      } else {
        d[field] = value;
      }
    }

    // TODO: check if we need to update the bucket (remove old and create a new one)
    //       this may delete all the current data => create a method to update
    //       the configuration of the bucket only then.

    if (!campaignId || !offerId || !key) {
      return;
    }

    // get the offer related info
    var signalData = this.signalHandler.getSignalData(campaignId);
    if (!signalData) {
      signalData = {
        created_ts: Date.now(),
        ucid: this.uuid(),
        offers: {}
      };
    }

    var offerData = signalData.offers[offerId];
    if(!offerData) {
      offerData = {
        created_ts: Date.now()
      };
      signalData.offers[offerId] = offerData; 
    };



    // merge (update) signal
    addOrCreate(offerData, key, 1);

    // set it back to the sig handler
    this.signalHandler.setSignalData(campaignId, signalData);
  }


  uuid() {
    function s4() {
      return Math.floor((1 + random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }
}
