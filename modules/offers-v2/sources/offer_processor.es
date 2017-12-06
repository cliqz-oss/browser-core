/*
 * @brief This will be the entry point for all the Offers to be shown. Here
 *        we will control all the display logic.
 */
import logger from './common/offers_v2_logger';
import ActionID from './actions_defs';
import FilterRulesEvaluator from './filter_rules_evaluator';
import events from '../core/events';
import prefs from '../core/prefs';
import { isChromium } from '../core/platform';


// /////////////////////////////////////////////////////////////////////////////
// consts
// the time we want to avoid any update on the DB for a particular offer. This cache
// is not persistence on disk, meaning will be just an optimization to avoid multiple
// updates everytime a offer is pushed.
const MAX_OFFER_CACHE_TIME_MS = 60 * 60 * 1000;

const MessageType = {
  MT_PUSH_OFFER: 'push-offer',
  MT_REMOVE_OFFER: 'remove-offer',
  MT_OFFERS_STATE_CHANGED: 'offers-state-changed'
};

const ORIGIN_ID = 'processor';

const FILTERS_OFF = 'offersFiltersOff';

// /////////////////////////////////////////////////////////////////////////////
export default class OfferProcessor {
  //
  constructor(sigHandler, baseDB, offersDB, offersStatusHandler) {
    this.baseDB = baseDB;
    this.offersDB = offersDB;
    this.offersStatusHandler = offersStatusHandler;

    // local offer-ids cached (offer_id -> cachedTime)
    this.offerUpdateCache = {};


    // filtering rules evaluator
    this.filterRuleEval = new FilterRulesEvaluator(this.offersDB);

    // the action function map for signals coming from the UI (not tracking)
    // There will be 2 type of signals:
    //  - (1) signals that are related to an offer and have some action on them (they
    //    change the status or any logic of the business).
    //  - (2) signals that are "actions" (telemtry) related to a particular offer but
    //    there is no influence on the logic in any form.
    //  - (3) signals that are not related to any offer at all (simple telemetry). This
    //    has no any effect on the main logic of offers.
    this.uiActionsMap = {
      // (1)
      'remove-offer': this._uiFunRemoveOffer.bind(this),
      'change-offer-state': this._uiFunOffersStateChanged.bind(this),
      // (2)
      'offer-action-signal': this._uiFunOfferActionSignal.bind(this),
      // (3)
      'action-signal': this._uiFunActionSignal.bind(this)
    };

    // signal handler
    this.sigHandler = sigHandler;
  }

  destroy() {
    if (this.sigHandler) {
      this.sigHandler.destroy();
    }
    if (this.filterRuleEval) {
      this.filterRuleEval.destroy();
    }
  }

  // /////////////////////////////////////////////////////////////////////////////

  savePersistenceData() {
  }

  // /////////////////////////////////////////////////////////////////////////////
  // add / remove offers

  //
  // @brief This method will be called everytime we should push an offer to the
  //        real estates. We will do some checkings before like:
  //         - proper format / fields.
  //         - apply filtering rules.
  //         - store it on DB if we don't have it, otherwise cache it and store it
  // @param offerInfo:
  // {
  //   offer_id: 'XX',
  //   ui_info: {
  //     template_name: 'template1',
  //     template_data: {
  //       // ...
  //     }
  //   },
  //   rule_info: {
  //     // the information associated to the rule we should apply to show this
  //   },
  //   filter_info: {
  //     // the filter rules options like: show if was not closed >= 3 times, or
  //     // was not created >= N days, etc
  //   }
  // }
  //
  // @param origin will be the origin who is calling this method.
  // @param newDisplayRule if the displayRule is different than the one the offer
  //                       currently has
  //
  pushOffer(offerInfo, newDisplayRule = null, originID = ORIGIN_ID) {
    // check offer validity
    if (!offerInfo ||
        !offerInfo.offer_id ||
        !offerInfo.display_id ||
        !offerInfo.campaign_id) {
      logger.warn('pushOffer: invalid offer or missing fields');
      return false;
    }

    // check if the offer is obsolete or not, if thats the case we directly skip
    // this step
    if (this._isOfferObsolete(offerInfo.offer_id)) {
      return false;
    }

    // this is the entry point for every place where we will create an offer.
    // Everyone who creates an offer should call this method.
    //
    this.sigHandler.setCampaignSignal(offerInfo.campaign_id,
                                      offerInfo.offer_id,
                                      originID,
                                      ActionID.AID_OFFER_TRIGGERED);

    // check if we should or should not show this offer
    if (!this._shouldShowOffer(offerInfo)) {
      logger.info(`pushOffer: We should not show this offer with ID: ${offerInfo.offer_id}`);
      this.sigHandler.setCampaignSignal(offerInfo.campaign_id,
                                        offerInfo.offer_id,
                                        originID,
                                        ActionID.AID_OFFER_FILTERED);
      return false;
    }

    // check if it is cached so we add it or update it
    if (!this._isOfferCached(offerInfo.offer_id)) {
      // we then need to add the offer to the DB and mark it as active
      if (this.offersDB.hasOfferData(offerInfo.offer_id)) {
        // try to update it just in case
        if (!this.offersDB.updateOfferObject(offerInfo.offer_id, offerInfo)) {
          logger.error(`pushOffer: Error updating the offer to the DB: ${offerInfo.offer_id}`);
          return false;
        }
      } else if (!this.offersDB.addOfferObject(offerInfo.offer_id, offerInfo)) {
        // it is a new one
        // we cannot continue here since we depend on having the offer in the DB
        logger.error(`pushOffer: Error adding the offer to the DB: ${offerInfo.offer_id}`);
        return false;
      }

      // cache the offer
      this._cacheOffer(offerInfo.offer_id);
    }

    // now we will publish the message notifying that we have a new offer
    const offerObject = this.offersDB.getOfferObject(offerInfo.offer_id);

    // track some signals
    this.offersDB.incOfferAction(offerObject.offer_id, ActionID.AID_OFFER_PUSHED);
    this.sigHandler.setCampaignSignal(offerObject.campaign_id,
                                      offerObject.offer_id,
                                      originID,
                                      ActionID.AID_OFFER_PUSHED);

    // broadcast the message
    let displayRule = newDisplayRule;
    if (!displayRule) {
      displayRule = offerObject.rule_info;
    }

    const msgData = {
      offer_id: offerObject.offer_id,
      display_rule: displayRule,
      offer_data: offerObject
    };
    const realStatesDest = this._getDestRealStatesForOffer(offerObject.offer_id);
    this._publishMessage(MessageType.MT_PUSH_OFFER, realStatesDest, msgData);
    return true;
  }

  /* ***************************************************************************
   *                            EXPOSED API
   *
   * check https://cliqztix.atlassian.net/wiki/pages/viewpage.action?pageId=88618158
   * for more information which are the functions and description
   ******************************************************************************/

  /**
   * will return a list of offers filtered and sorted as specified in args
   * @param  {object} args
   * <pre>
   * {
   *   // to filter entries using the following types of filters
   *   filters: {
   *     // will filter by real estate
   *     by_rs_dest: 'real-estate-name',
   *     // this flag will be used to ensure that we have the real estate destination
   *     // listed. This is a fix for EX-5468, we will need to change this later
   *     ensure_has_dest: true / false,
   *   }
   * }
   * </pre>
   * @return {[type]}      [description]
   */
  getStoredOffers(args) {
    // for this first version we will just return all the offers directly
    const self = this;
    const rawOffers = this.offersDB.getOffers();
    const result = [];
    const filters = args ? args.filters : null;

    rawOffers.forEach((offerElement) => {
      if (filters) {
        // we should filter
        if (filters.ensure_has_dest &&
            (!offerElement.offer.rs_dest || (offerElement.offer.rs_dest.length === 0))) {
          // skip this one, since doesn't contain real estate destinations
          return;
        }
        if (filters.by_rs_dest && offerElement.offer.rs_dest) {
          // check the real estate destination of the offer
          if (offerElement.offer.rs_dest.indexOf(filters.by_rs_dest) < 0) {
            // skip this one
            return;
          }
        }
      }
      result.push({
        offer_id: offerElement.offer_id,
        offer_info: offerElement.offer,
        created_ts: offerElement.created,
        attrs: {
          state: self.offersDB.getOfferAttribute(offerElement.offer_id, 'state')
        }
      });
    });
    return result;
  }

  /**
   * This method will update all the current offers we have on the DB and remove
   * the ones that are obsolete using the offers-status-handler.
   * @return {[type]} [description]
   */
  updateOffersStatus() {
    const rawOffers = this.offersDB.getOffers();
    rawOffers.forEach((offerElement) => {
      // EX-5923: we will need to remove all the offers that are obsolete
      if (this._isOfferObsolete(offerElement.offer_id)) {
        // remove this from the database without emitting any signal
        this.offersDB.removeOfferObject(offerElement.offer_id);
      }
    });
  }

  /**
   * This method will be called from externals (other modules) to generate a new
   * offer on our system. This will bypass the trigger engine system.
   * If the offer already exists nothing will be done.
   * One example of use can be for example the dropdown that the offers are triggered
   * from the search results and is not related with our system, but we still need
   * to track the offer actions and more. For this purpose we will provide an API
   * to generate offers from outside.
   * @param  {object} args The argument containing the following information:
   * <pre>
   * {
   *   // the one who is performing the call
   *   origin: 'dropdown',
   *
   *   // for more information about what is the required offer data needed
   *   // check:
   *   // https://cliqztix.atlassian.net/wiki/pages/viewpage.action?pageId=89041894
   *   {
   *     data: {
   *       offer_id: 'xyz',
   *       campaign_id: 'c_id',
   *       display_id: 'd_id',
   *
   *       // the rule information on how we should display this offer if any
   *       rule_info: {
   *         // ...
   *       },
   *
   *       // the ui information how we should display this offer
   *       ui_info: {
   *         // ...
   *       },
   *
   *       // the list of destinations (real estates) where this offer should be
   *       // displayed
   *       rs_dest: ['xyz1',...]
   *     },
   *     // ...
   *   }
   * }
   * </pre>
   * @return {Boolean} true on success (offer created) | false otherwise
   */
  createExternalOffer(args) {
    if (!args || !args.origin || !args.data) {
      logger.warn('createExternalOffer: invalid arguments');
      return false;
    }
    if (this.hasExternalOffer(args)) {
      // already exists
      return false;
    }
    return this.pushOffer(args.data, null, args.origin);
  }

  /**
   * Check if we have an offer present on the DB or not
   * @param  {object}  The following data should be on the argument:
   * <pre>
   *
   * {
   *   data: {
   *     // the offer id we want to check if exists or not
   *     offer_id: 'xyz'
   *   }
   * }
   * </pre>
   * @return {Boolean}         true if we have | false otherwise.
   */
  hasExternalOffer(args) {
    if (!args ||
        !args.data ||
        !args.data.offer_id) {
      return false;
    }
    return this.offersDB.isOfferPresent(args.data.offer_id);
  }

  // /////////////////////////////////////////////////////////////////////////////
  // internal methods


  /**
   * will check if we have an offer on memory recently added / updated on the DB.
   * @param  {string}  offerID [description]
   * @return {Boolean}         true if it is cached, false otherwise
   */
  _isOfferCached(offerID) {
    if (!offerID) {
      return false;
    }
    const cachedTime = this.offerUpdateCache[offerID];
    if (!cachedTime) {
      return false;
    }
    const now = Date.now();
    const diffTime = now - cachedTime;
    if (diffTime > MAX_OFFER_CACHE_TIME_MS) {
      delete this.offerUpdateCache[offerID];
      return false;
    }
    // still cached
    return true;
  }

  // check if an offer is obsolete or not
  _isOfferObsolete(offerID) {
    return this.offersStatusHandler.getOfferStatus(offerID) === 'obsolete';
  }

  /**
   * will cache an offer id on memory with the current timestamp.
   * @param  {[type]} offerID [description]
   */
  _cacheOffer(offerID) {
    if (!offerID) {
      return;
    }
    this.offerUpdateCache[offerID] = Date.now();
  }

  //
  // @brief Remove a particular offer
  //
  _removeOffer(offerID) {
    const offerObj = this.offersDB.getOfferObject(offerID);
    if (!offerObj) {
      logger.warn(`removeOffer: the offer ${offerID} is not on our DB`);
      return false;
    }

    // remove the offer from the DB
    if (!this.offersDB.removeOfferObject(offerID)) {
      logger.warn(`removeOffer: failed removing the offer object from the DB ${offerID}`);
      return false;
    }

    // track signal
    const campaignID = this.offersDB.getCampaignID(offerID);
    this.sigHandler.setCampaignSignal(campaignID,
                                      offerID,
                                      ORIGIN_ID,
                                      ActionID.AID_OFFER_DB_REMOVED);

    // we emit the event for the real states now
    const realStatesDest = this._getDestRealStatesForOffer(offerID);
    const data = { offer_id: offerID };
    this._publishMessage(MessageType.MT_REMOVE_OFFER, realStatesDest, data);

    return true;
  }

  /**
   * This method will process the messages coming from the real states or anyone
   * that will interact with the offers-core module
   * @param  {[type]} msg Is the object containing all the message information.
   *                      For more information check the documentation
   * @return {[type]}     [description]
   */
  processRealEstateMessage(msg) {
    // message:
    // {
    //    origin: who is sending it,
    //    type: message type, should be one of the one listed on the functions map
    //    data: {...},  object containing the data depending on the message type
    // }

    if (!msg || !msg.origin || !msg.type || !msg.data) {
      logger.error('ProcessRealEstateMessage: invalid message format, discarding it');
      return false;
    }

    // check if we have the associated function
    const handlerFun = this.uiActionsMap[msg.type];
    if (!handlerFun) {
      logger.warn(`ProcessRealEstateMessage: we cannot process the message type ${msg.type}`);
      return false;
    }

    // we can, so we call the method
    return handlerFun(msg);
  }

  //
  // @brief check the rules and current data to see if the offer should be shown
  //        or not
  // @precondition: Assumes that the offer history is ready for this offer
  // @return true if it should | false otherwise
  //
  _shouldShowOffer(offerInfo) {
    if (!offerInfo) {
      logger.error('_shouldShowOffer: the offer is null');
      return false;
    }
    const rules = offerInfo.filter_info;
    const offerID = offerInfo.offer_id;
    return prefs.get(FILTERS_OFF, false) || this.filterRuleEval.shouldWeShowOffer(offerID, rules);
  }

  _getDestRealStatesForOffer(offerID) {
    const offerObj = this.offersDB.getOfferObject(offerID);
    if (!offerObj || !offerObj.rs_dest) {
      return [];
    }
    return offerObj.rs_dest;
  }

  /**
   * this will publish a message into the common channel so all the real states
   * can get the message and do something with it.
   * Check the documentation for more information about messages types and format.
   * @param  {[type]} type       [description]
   * @param  {[type]} destList   [description]
   * @param  {[type]} data       [description]
   * @return {[type]}            [description]
   */
  _publishMessage(type, destList, data) {
    // for now for backward compatibility we will hardcode this part here.
    // in the future we should adapt the ui (ghostery) to this new interface.
    try {
      // this will be the normal case
      const message = {
        origin: 'offers-core',
        type,
        dest: destList,
        data,
      };

      if (isChromium && type === MessageType.MT_PUSH_OFFER) {
        events.pub('msg_center:show_message', message, 'ghostery');
        return;
      }

      events.pub('offers-send-ch', message);
    } catch (err) {
      logger.error(`_publishMessage: something failed publishing the message ${JSON.stringify(err)}`);
    }
  }

  // ///////////////////////////////////////////////////////////////////////////
  // actions from ui

  _uiFunRemoveOffer(msg) {
    if (!msg.data || !msg.data.offer_id) {
      logger.warn(`_uiFunRemoveOffer: invalid format of the message: ${JSON.stringify(msg)}`);
      return false;
    }
    const offerID = msg.data.offer_id;
    const campaignID = this.offersDB.getCampaignID(offerID);
    logger.info(`_uiFunRemoveOffer: called for offer id: ${offerID}`);
    this.sigHandler.setCampaignSignal(campaignID, offerID, msg.origin, ActionID.AID_OFFER_REMOVED);
    this.offersDB.incOfferAction(offerID, ActionID.AID_OFFER_REMOVED);

    return this._removeOffer(offerID);
  }

  /**
   * Record signals that are not related to a campaign or offer.
   * @param  {[type]} options.data    [description]
   * @param  {[type]} options.origin  [description]
   * @return {[type]}                 [description]
   */
  _uiFunActionSignal(msg) {
    if (!msg.data || !msg.data.action_id) {
      logger.warn(`_uiFunActionSignal: data: ${msg.data} are invalid`);
      return false;
    }
    // we will send the new signal here depending on the action id:
    const counter = msg.data.counter ? msg.data.counter : 1;
    this.sigHandler.setActionSignal(msg.data.action_id, msg.origin, counter);

    return true;
  }

  _uiFunOffersStateChanged(msg) {
    if (!msg.data || !msg.data.offers_ids || !msg.data.new_state) {
      logger.warn(`_uiFunOffersStateChanged: invalid arguments: ${JSON.stringify(msg)}`);
      return false;
    }

    // for each of the offers we now set the new state
    let somethingModified = false;
    const self = this;
    msg.data.offers_ids.forEach((oid) => {
      const campaignID = this.offersDB.getCampaignID(oid);
      if (!campaignID) {
        logger.warn(`_uiFunOffersStateChanged: offer with ID ${oid} is not present?`);
        return;
      }
      // change the state here directly
      self.offersDB.addOfferAttribute(oid, 'state', msg.data.new_state);
      somethingModified = true;
    });

    // TODO: do we want to track this here? for example the history that the
    // state has changed? maybe not since it will happen very frequent in some
    // real states.

    if (somethingModified) {
      // emit a message to all the real states?
      const realStatesDest = [];
      const msgData = {
        offer_ids: msg.data.offers_ids
      };
      this._publishMessage(MessageType.MT_OFFERS_STATE_CHANGED, realStatesDest, msgData);
    }
    return true;
  }


  /**
   * This method will track all the action signals that are related to an offer
   * but doesn't modify the logic of the core or anything, just for information.
   * @param  {[type]} options.offerID [description]
   * @param  {[type]} options.data    [description]
   * @param  {[type]} options.origin  [description]
   * @return {[type]}                 [description]
   */
  _uiFunOfferActionSignal(msg) {
    if (!msg.data ||
        !msg.data.offer_id ||
        !msg.data.action_id ||
        typeof msg.data.action_id !== 'string') {
      logger.warn(`_uiFunOfferActionSignal: invalid arguments: ${JSON.stringify(msg)}`);
      return false;
    }
    const offerID = msg.data.offer_id;
    const campaignID = this.offersDB.getCampaignID(offerID);
    if (!campaignID) {
      logger.warn(`_uiFunOfferActionSignal: no campaign id for offer ${offerID}`);
      return false;
    }

    // send signal and add it as action on the offer list
    const counter = msg.data.counter ? msg.data.counter : 1;
    this.sigHandler.setCampaignSignal(campaignID, offerID, msg.origin, msg.data.action_id, counter);
    this.offersDB.incOfferAction(offerID, msg.data.action_id, counter);

    return true;
  }


}
