import LoggingHandler from '../logging_handler';
import EmptyEnvironment from './empty_environment'
import OffersConfigs from '../offers_configs';
import ActionID from '../actions_defs';
import random from '../../core/crypto/random';
import utils from '../../core/utils';
import events from '../../core/events';

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

      // we will always set the engine version as argument
      params.t_eng_ver = OffersConfigs.TRIGGER_ENGINE_VERSION;
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
          return;
        }
        else {
          reject('Status code ' + req.status + ' for ' + url + this.statusText);
          return;
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

  displayOffer(offerId, ruleInfo) {
    this.offerProcessor.displayOffer(offerId, ruleInfo);
  }

  addOffer(offerInfo) {
    this.offerProcessor.addOffer(offerInfo);
  }

  removeOffer(offerId) {
    this.offerProcessor.removeOffer(offerId);
  }

  isOfferActive(offerId) {
    if (this.offerProcessor) {
      return this.offerProcessor.isOfferActive(offerId);
    } else {
      return false;
    }
  }

  isOfferPresent(offerID) {
    if (!this.offersDB) {
      return false;
    }
    return this.offersDB.isOfferPresent(offerID);
  }

  getOfferLastUpdate(offerId, signal) {
    var offerProc = this.offerProcessor;

    if(!offerProc.offersDB) {
      return null;
    }

    var actionID;
    if(signal === 'offer-added') {
      actionID = ActionID.AID_OFFER_ADDED;
    } else {
      return null;
    }

    // check if we have data for this offer id
    const offerActionMeta = offerProc.offersDB.getOfferActionMeta(offerId, actionID)
    if (!offerActionMeta) {
      return null;
    }
    return offerActionMeta.l_u_ts;
  }


  sendSignal(offerId, key) {
    if (!offerId || !key || !this.offersDB) {
      return;
    }

    // get the campaign id for this offer if we have one.
    const campaignId = this.offersDB.getCampaignID(offerId);
    if (!campaignId) {
      return;
    }

    // send the signal associated to the campaign using the origin trigger
    const originID = 'trigger';
    this.signalHandler.setCampaignSignal(campaignId, offerId, originID, key);
  }

  getPref(pref,default_val) {
    return utils.getPref(String(pref),default_val);
  }

  /**
   * This method will return the unique generated number for a particular browser.
   * If the value is not generated yet will create a new one.
   * @return {int} the unique number we have for this user, the values will be between
   *               [0, 9999].
   */
  getABNumber() {
    const prefID = 'offersUniqueNumber';
    let num = null;
    if (!utils.hasPref(prefID)) {
      // generate one
      num = Math.floor(random() * 10000);
      utils.setPref(prefID, num.toString());
    } else {
      // we get it and transform it to num
      num = Number(utils.getPref(prefID, 0));
    }

    return num;
  }

}
