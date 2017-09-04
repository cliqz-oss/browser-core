import Expression from '../expression';
import { timestampMS } from '../../utils';


/**
 * send a signal to the BE, always associated to an offer. The offer will not be
 * the one provided on the arguments but we will get the latest offer active
 * for the given campaign:
 * offersIDs = offersForCampaign(campaignIDFromOffer(offer_id))
 * offerIDToUse = getLatestUpdatedOffer(offersIDs)
 * @param  {String} offerID The associated offer ID
 * @param  {String} actionID Is the signal name (key) to be sent
 * @param  {String} campaign id (@deprecated since it will not be used)
 * @param  {Object} will be a dictionary (object) with the following structure
 * <pre>
 * {
 *   // will be used to store the url where the signal will be sent getting it
 *   // from the context (current url). If the store is true and the url is on
 *   // the DB then we will change the signal name to repeated_ + signal_name.
 *   // On store == true we will also store the current url if not added before
 *   // If store == false we will not do anything described above.
 *   store: true / false,
 *
 *   // this parameter will be used (if present) to check when was the last signal
 *   // with the same name for the same campaign associated, and if exists we will
 *   // check the delta time from now to the last time we sent this signal.
 *   // in that case we will filter every signal that happened in that period of time
 *   // (now - last_signal_ts).
 *   // if this field is null or <= 0 nothing will be checked / filtered.
 *   filter_last_secs: N
 * }
 * </pre>
 * @version 2.0
 */
class SendSignalExpr extends Expression {
  constructor(data) {
    super(data);
    this.offerID = null;
    this.key = null;
    this.options = null;

    // build the referrer cat map
    this.referrerCatMap = {
      // search cat
      google: 'search',
      yahoo: 'search',
      bing: 'search',
      duckduckgo: 'search'
      // meta-searchers?
    };
  }

  isBuilt() {
    return this.offerID && this.key;
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 2) {
      throw new Error('SendSignalExpr invalid args');
    }
    this.offerID = this.data.raw_op.args[0];
    this.key = this.data.raw_op.args[1];
    // we will skip the campaign id since it is not used this.data.raw_op.args[2]
    this.options = this.data.raw_op.args[3];
  }

  destroy() {
  }

  getExprValue(ctx) {
    // if we do not have an offer already here then we will not create anything
    // here.
    if (!this.key || !this.data.offers_db.isOfferPresent(this.offerID)) {
      return Promise.resolve(false);
    }

    // EX-5017: store the action signal on the offer as well.
    // We will comment this line and fix it later on 1.19 since this will break
    // another behavior that is more important than this one. If we update the action
    // here on the offer db then when we get the latest offer that was updated
    // will be always this one.
    // We need to add a filter on db (extra argument) to avoid updating the latest
    // status of the offer for particular actions (silent actions).
    //
    // eventLoop.environment.incOfferAction(offerID, key);

    // we should get the associated offers for the current campaign id
    const campaignID = this.data.offers_db.getCampaignID(this.offerID);
    if (!campaignID) {
      return Promise.resolve(false);
    }

    const campaignOffers = this.data.offers_db.getCampaignOffers(campaignID);
    if (!campaignOffers) {
      return Promise.resolve(false);
    }

    const latestUpdatedOffers = this.data.offers_db.getLatestUpdatedOffer(campaignOffers);
    if (!latestUpdatedOffers ||
        latestUpdatedOffers.length <= 0 ||
        !latestUpdatedOffers[0].offer_id) {
      return Promise.resolve(false);
    }

    // we now get the latest updated offer that will be used to sent the signal
    const offerIDToUse = latestUpdatedOffers[0].offer_id;

    // check if we have this.options as arguments
    let sigToSend = this.key;
    let shouldFilterSignal = false;
    let referrerCat = null;
    if (this.options) {
      const currUrl = ctx['#url'];
      if (this.options.store && currUrl) {
        if (!this.data.url_signal_db) {
          return Promise.reject(new Error('we dont have the url_signal_db?'));
        }
        // we need to check on the DB the current url
        const sendSignalDb = this.data.url_signal_db;
        const urlEntryCont = sendSignalDb.getEntryContainer(currUrl);
        if (urlEntryCont) {
          // we need to increment the counter
          urlEntryCont.data.counter += 1;
          // update the key
          sigToSend = `repeated_${this.key}`;
        } else {
          sendSignalDb.setEntryData(currUrl, { counter: 1 });
        }
      }

      if (this.options.filter_last_secs && this.options.filter_last_secs > 0) {
        if (!this.data.last_campaign_signal_db) {
          return Promise.reject(new Error('we dont have the last_campaign_signal_db?'));
        }
        const lastCmpSignalDB = this.data.last_campaign_signal_db;
        let campaignMap = lastCmpSignalDB.getEntryData(campaignID);
        let lastUpdateTS = null;
        const now = timestampMS();
        if (!campaignMap) {
          // we need to create one
          campaignMap = {
            [this.key]: {
              counter: 1,
              l_u_ts: now
            }
          };
        } else {
          const keyMap = campaignMap[this.key];
          if (!keyMap) {
            campaignMap[this.key] = { counter: 1, l_u_ts: now };
          } else {
            campaignMap[this.key].counter += 1;
            lastUpdateTS = keyMap.l_u_ts;
            keyMap.l_u_ts = now;
          }
        }
        lastCmpSignalDB.setEntryData(campaignID, campaignMap);

        // check last update if we have it
        const deltaTime = (now - lastUpdateTS) / 1000;
        if (lastUpdateTS && (deltaTime <= this.options.filter_last_secs)) {
          shouldFilterSignal = true;
        }
      }

      if (this.options.referrer_cat) {
        // we get the referrer cat
        referrerCat = this._getReferrerCat(ctx['#referrer']);
        if (referrerCat) {
          referrerCat = `ref_${referrerCat}`;
        }
      }
    }

    // check if we need to filter the signal or not
    let result = true;
    if (!shouldFilterSignal) {
      result = this._sendSignal(offerIDToUse, sigToSend, referrerCat);
    }

    return Promise.resolve(result);
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Private methods
  // ///////////////////////////////////////////////////////////////////////////

  _getReferrerCat(referrerName) {
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

  _sendSignal(offerId, key, referrer = null) {
    if (!offerId || !key || !this.data.offers_db) {
      return false;
    }

    // get the campaign id for this offer if we have one.
    const campaignId = this.data.offers_db.getCampaignID(offerId);
    if (!campaignId) {
      return false;
    }

    // send the signal associated to the campaign using the origin trigger
    const originID = 'trigger';
    const sigHandler = this.data.signals_handler;
    let result = sigHandler.setCampaignSignal(campaignId, offerId, originID, key);

    // we also add the referrer category here
    if (referrer !== null) {
      result = sigHandler.setCampaignSignal(campaignId, offerId, originID, referrer) &&
               result;
    }
    return result;
  }

}


const ops = {
  $send_signal: SendSignalExpr
};

export default ops;
