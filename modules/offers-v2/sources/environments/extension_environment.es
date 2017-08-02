import LoggingHandler from '../logging_handler';
import EmptyEnvironment from './empty_environment'
import OffersConfigs from '../offers_configs';
import ActionID from '../actions_defs';
import random from '../../core/crypto/random';
import utils from '../../core/utils';
import events from '../../core/events';
import { timestampMS } from '../utils';


const MODULE_NAME = 'extension_environment';

export default class ExtensionEnvironment extends EmptyEnvironment {

  constructor() {
    super();
    // tbis will be the list of
    this.referrerCatMap = {
      // search cat
      google: 'search',
      yahoo: 'search',
      bing: 'search',
      duckduckgo: 'search'
      // meta-searchers?
    };
  }

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

  pushOffer(offerInfo, newDisplayRule, originID) {
    return this.offerProcessor.pushOffer(offerInfo, newDisplayRule, originID);
  }

  isOfferPresent(offerID) {
    if (!this.offersDB) {
      return false;
    }
    return this.offersDB.isOfferPresent(offerID);
  }

  getCampaignID(offerID) {
    if (!this.offersDB) {
      return null;
    }
    return this.offersDB.getCampaignID(offerID);
  }

  getCampaignOffers(campaignID) {
    if (!this.offersDB) {
      return null;
    }
    return this.offersDB.getCampaignOffers(campaignID);
  }

  getLatestUpdatedOffer(offersIDsSet) {
    if (!this.offersDB) {
      return null;
    }
    return this.offersDB.getLatestUpdatedOffer(offersIDsSet);
  }

  incOfferAction(offerID, actionID) {
    if (!this.offersDB) {
      return;
    }
    this.offersDB.incOfferAction(offerID, actionID);
  }

  getOfferLastUpdate(offerId) {
    var offerProc = this.offerProcessor;

    if(!offerProc.offersDB) {
      return null;
    }

    // check if we have data for this offer id
    const offerMeta = offerProc.offersDB.getOfferMeta(offerId)
    if (!offerMeta) {
      return null;
    }
    return offerMeta.l_u_ts;
  }


  sendSignal(offerId, key, referrer = null) {
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

    // we also add the referrer category here
    if (referrer !== null) {
      this.signalHandler.setCampaignSignal(campaignId, offerId, originID, referrer);
    }
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

  timestampMS() {
    return timestampMS();
  }

  getReferrerCat(referrerName) {
    if (!referrerName || referrerName === '') {
      // it is none
      return 'none';
    }
    const refCat = this.referrerCatMap[referrerName];
    if (!refCat) {
      // is other
      return 'other';
    }
    return refCat;
  }

}
