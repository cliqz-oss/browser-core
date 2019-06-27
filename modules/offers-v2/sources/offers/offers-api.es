/**
 * This file contains the implementation of the OffersAPI which basically
 * provides the following functionality:
 *
 * - Given an offer -> broadcast it to the proper real estates.
 * - Receive all the signals from the real estates and keep tracking of the events
 * - Send accordingly signals when required.
 *
 * In this module we also store the offer on the DB if is not already.
 *
 *
 */
import events from '../../core/events';
import logger from '../common/offers_v2_logger';
import ActionID from './actions-defs';
import Offer from './offer';

const MessageType = {
  MT_PUSH_OFFER: 'push-offer',
  MT_REMOVE_OFFER: 'remove-offer',
  MT_OFFERS_STATE_CHANGED: 'offers-state-changed'
};

// For history reasons we will keep the processor name here
const ORIGIN_ID = 'processor';

// /////////////////////////////////////////////////////////////////////////////
export default class OffersAPI {
  //
  constructor(sigHandler, offersDB, backendConnector) {
    this.offersDB = offersDB;
    this.backendConnector = backendConnector;

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

  // /////////////////////////////////////////////////////////////////////////////
  // add / remove offers

  /**
   * This method will push the offer to all the proper real estates.
   * It takes an Offer (wrapper) object.
   *
   * The main logic is as follow:
   * - Check offer validity
   * - Add or update offer on the database.
   * - distribute to destination real estates.
   *
   * Prerequisite: offer filtering is already done.
   *
   * @method pushOffer
   * @param {Offer} offer
   * @param {object} newDisplayRule
   *   If the displayRule is different than the one the offer
   *   currently has
   * @param {string} origin
   *   will be the origin who is calling this method.
   * @param {OfferMatchTraits} matchTraits
   *   Reason why to push the offer
   * @returns {boolean} true on success
   */
  //
  //
  pushOffer(offer, newDisplayRule = null, originIDin = null, matchTraits = null) {
    const originID = originIDin || ORIGIN_ID;
    if (!offer || !offer.isValid()) {
      logger.warn('pushOffer: invalid offer or missing fields');
      return false;
    }

    const ok = this._createOrUpdateInDB(offer);
    if (!ok) {
      logger.warn('Failed to createOrUpdateDB');
      return false;
    }
    if (!this.offersDB.addReasonForHaving(offer.uniqueID, matchTraits)) {
      logger.warn('Failed to addReasonForHaving');
      return false;
    }

    // EX-7208: moving this offer_triggered signal here to ensure that
    // we could save the offer properly

    // this is the entry point for every place where we will create an offer.
    // Everyone who creates an offer should call this method.
    // TODO: @salvador this is probably not needed anymore since pushed will
    // always gonna happen if triggered (filtered is not happening here anymore)
    //
    this.sigHandler.setCampaignSignal(
      offer.campaignID,
      offer.uniqueID,
      originID,
      ActionID.AID_OFFER_TRIGGERED
    );

    // process offer pushed
    this.offersDB.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_PUSHED);
    this.sigHandler.setCampaignSignal(
      offer.campaignID,
      offer.uniqueID,
      originID,
      ActionID.AID_OFFER_PUSHED
    );
    if (offer.hasDynamicContent()) {
      this.sigHandler.setCampaignSignal(
        offer.campaignID,
        offer.uniqueID,
        originID,
        ActionID.AID_DYNAMIC_OFFER_PUSHED
      );
    }

    // broadcast the message
    const displayRule = newDisplayRule || offer.ruleInfo;

    const isCodeHidden = true;
    this.offersDB.addOfferAttribute(offer.uniqueID, 'isCodeHidden', isCodeHidden);
    const offerMeta = this.offersDB.getOfferMeta(offer.uniqueID) || {};
    const msgData = {
      offer_id: offer.uniqueID,
      display_rule: displayRule,
      offer_data: offer.offerObj,
      createdTs: offerMeta.c_ts,
      attrs: { isCodeHidden },
    };
    const realStatesDest = offer.destinationRealEstates;
    this._publishMessage(MessageType.MT_PUSH_OFFER, realStatesDest, msgData);
    return true;
  }

  _createOrUpdateInDB(offer) {
    return this.offersDB.hasOfferObject(offer.uniqueID)
      ? this._updateInDB(offer)
      : this._createInDB(offer);
  }

  _updateInDB(offer) {
    const dbOffer = this.offersDB.getOfferObject(offer.uniqueID);
    // dbOffer!=null is guaranteed by a caller
    if (offer.version === dbOffer.version) { return true; }
    const ok = this.offersDB.updateOfferObject(offer.uniqueID, offer.offerObj);
    if (!ok) {
      const msg = `pushOffer: Error updating the offer to the DB: ${offer.uniqueID}`;
      logger.error(msg);
    }
    return ok;
  }

  _createInDB(offer) {
    const ok = this.offersDB.addOfferObject(offer.uniqueID, offer.offerObj);
    if (!ok) {
      const msg = `pushOffer: Error adding the offer to the DB: ${offer.uniqueID}`;
      logger.error(msg);
    }
    return ok;
  }

  /* ***************************************************************************
   *                            EXPOSED API
   ***************************************************************************** */

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
    const rawOffers = this.offersDB.getOffers();
    const filters = args ? args.filters : null;
    if (!filters) { return rawOffers.map(o => this._transformRawOffer(o)); }
    const result = rawOffers
      .filter((offerElement) => {
        const rsDest = (offerElement.offer && offerElement.offer.rs_dest) || [];
        if (filters.ensure_has_dest && rsDest.length === 0) { return false; }
        if (!filters.by_rs_dest || rsDest.length === 0) { return true; }

        const realEstatesSet = typeof filters.by_rs_dest === 'string'
          ? new Set([filters.by_rs_dest])
          : new Set(filters.by_rs_dest);
        const hasDest = rsDest.some(dre => realEstatesSet.has(dre));
        return hasDest;
      })
      .map(o => this._transformRawOffer(o));
    return result;
  }

  /* eslint-disable camelcase */
  _transformRawOffer({ offer_id, offer, created, last_update }) {
  /* eslint-enable camelcase */
    return {
      offer_info: offer,
      created_ts: created,
      last_update_ts: last_update,
      attrs: {
        state: this.offersDB.getOfferAttribute(offer_id, 'state'),
        isCodeHidden: this.offersDB.getOfferAttribute(offer_id, 'isCodeHidden') || false,
      },
      offer_id
    };
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
    return this.pushOffer(new Offer(args.data), null, args.origin);
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
    if (!args
        || !args.data
        || !args.data.offer_id) {
      return false;
    }
    return this.offersDB.isOfferPresent(args.data.offer_id);
  }

  /**
   * This method should be called whenever an offer is removed from the DB
   */
  offerRemoved(offerID, campaignID, erased) {
    if (!erased) { return; }

    // add the new signal to be sent and force to be sent right away
    // we should remove the associated signals on the signal handler here
    this.sigHandler.setCampaignSignal(
      campaignID,
      offerID,
      ORIGIN_ID,
      ActionID.AID_OFFER_EXPIRED
    );
    // we force the signal handler to send the signal now
    this.sigHandler.sendCampaignSignalNow(campaignID).then(
      () => this.sigHandler.removeCampaignSignals(campaignID)
    );
  }

  // /////////////////////////////////////////////////////////////////////////////
  // internal methods

  //
  // @brief Remove a particular offer
  //
  _removeOffer(campaignID, offerID) {
    if (!this.offersDB.hasOfferData(offerID)) {
      logger.warn(`removeOffer: the offer ${offerID} is not on our DB`);
      return false;
    }

    const ok = this.offersDB.removeOfferObject(offerID);
    if (!ok) {
      logger.warn(`removeOffer: failed removing the offer object from the DB ${offerID}`);
      return false;
    }

    // track signal
    this.sigHandler.setCampaignSignal(
      campaignID,
      offerID,
      ORIGIN_ID,
      ActionID.AID_OFFER_DB_REMOVED
    );

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

      events.pub('offers-send-ch', message);
    } catch (err) {
      logger.error(`_publishMessage: something failed publishing the message ${JSON.stringify(err)}`);
    }
  }

  _getDestRealStatesForOffer(offerID) {
    const offerObject = this.offersDB.getOfferObject(offerID) || {};
    return offerObject.rs_dest || [];
  }

  // ///////////////////////////////////////////////////////////////////////////
  // actions from ui

  _uiFunRemoveOffer(msg) {
    const offerID = msg.data && msg.data.offer_id;
    if (!offerID) {
      logger.warn(`_uiFunRemoveOffer: invalid format of the message: ${JSON.stringify(msg)}`);
      return false;
    }
    const campaignID = this.offersDB.getCampaignID(offerID);
    logger.info(`_uiFunRemoveOffer: called for offer id: ${offerID}`);
    this.sigHandler.setCampaignSignal(campaignID, offerID, msg.origin, ActionID.AID_OFFER_REMOVED);
    this.offersDB.incOfferAction(offerID, ActionID.AID_OFFER_REMOVED);

    return this._removeOffer(campaignID, offerID);
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
    if (!msg.data
        || !msg.data.offer_id
        || !msg.data.action_id
        || typeof msg.data.action_id !== 'string') {
      logger.warn(`_uiFunOfferActionSignal: invalid arguments: ${JSON.stringify(msg)}`);
      return false;
    }
    const offerID = msg.data.offer_id;
    const campaignID = msg.data.campaign_id || this.offersDB.getCampaignID(offerID);
    if (!campaignID) {
      logger.warn(`_uiFunOfferActionSignal: no campaign id for offer ${offerID}`);
      return false;
    }

    const isCodeHidden = this.offersDB.getOfferAttribute(offerID, 'isCodeHidden') || false;
    if (isCodeHidden && ['offer_ca_action', 'code_copied'].includes(msg.data.action_id)) {
      this.offersDB.addOfferAttribute(offerID, 'isCodeHidden', false);
      const code = this.offersDB.getOfferTemplateData(offerID).code;
      const url = `offers/${encodeURIComponent(offerID)}/code-was-used/`;
      if (code) { this.backendConnector.sendApiRequest(url, { code }, 'POST'); }
    }

    // send signal and add it as action on the offer list
    const counter = msg.data.counter || 1;
    this.sigHandler.setCampaignSignal(campaignID, offerID, msg.origin, msg.data.action_id, counter);
    return this.offersDB.incOfferAction(offerID, msg.data.action_id, counter);
  }
}
