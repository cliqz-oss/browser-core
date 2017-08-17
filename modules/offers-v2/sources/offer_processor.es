/*
 * @brief This will be the entry point for all the Offers to be shown. Here
 *        we will control all the display logic.
 */

import LoggingHandler from './logging_handler';
import ActionID from './actions_defs';
import { openNewTabAndSelect } from './utils';
import FilterRulesEvaluator from './filter_rules_evaluator';
import events from '../core/events';
import { isChromium } from '../core/platform';
import OfferDB from './offers_db';


// /////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'offer_processor';

// TODO: remove this methods
function linfo(msg) {
  if (LoggingHandler.LOG_ENABLED) {
    LoggingHandler.info(MODULE_NAME, msg);
  }
}
function lwarn(msg) {
  if (LoggingHandler.LOG_ENABLED) {
    LoggingHandler.warning(MODULE_NAME, msg);
  }
}
function lerr(msg) {
  if (LoggingHandler.LOG_ENABLED) {
    LoggingHandler.error(MODULE_NAME, msg);
  }
}

const MessageType = {
  MT_NEW_OFFER_ACTIVE: 'offer-active',
  MT_DISPLAY_OFFER: 'display-offer',
  MT_CLOSE_OFFER: 'close-offer',
  MT_OFFER_DEACTIVATED: 'offer-deactivated',
  MT_REMOVE_OFFER: 'remove-offer',
  MT_OFFERS_STATE_CHANGED: 'offers-state-changed'
};

const ORIGIN_ID = 'processor';

// /////////////////////////////////////////////////////////////////////////////
export default class OfferProcessor {

  //
  constructor(sigHandler, baseDB, offersDB) {
    if (typeof OffersDB !== typeof OfferDB) {
      lerr('ERROR: wrong type?');
    }
    this.baseDB = baseDB;
    this.offersDB = offersDB;

    // active offers (not mean being displayed)
    this.activeOffers = new Set();

    // filtering rules evaluator
    this.filterRuleEval = new FilterRulesEvaluator(this.offersDB);

    // the action function map for signals coming from the UI (not tracking)
    // There will be 3 type of signals:
    //  - (1) signals that are related to an offer and have some action on them (they
    //    change the status or any logic of the business).
    //  - (2) signals that are "actions" (telemtry) related to a particular offer but
    //    there is no influence on the logic in any form.
    //  - (3) signals that are not related to any offer at all (simple telemetry). This
    //    has no any effect on the main logic of offers.
    this.uiActionsMap = {
      // (1)
      'call-to-action': this._uiFunCallToAction.bind(this),
      'close-offer': this._uiFunCloseOffer.bind(this),
      'remove-offer': this._uiFunRemoveOffer.bind(this),
      'offers-state-changed': this._uiFunOffersStateChanged.bind(this),
      // (2)
      'offer-action-signal': this._uiFunOfferActionSignal.bind(this),
      // (3)
      'action-signal': this._uiFunActionSignal.bind(this)
    };

    // signal handler
    this.sigHandler = sigHandler;

    // listen for messages on the channel
    this._processRealStateMessage = this._processRealStateMessage.bind(this);
    events.sub('offers-recv-ch', this._processRealStateMessage);
  }

  destroy() {
    // unsubscribe
    events.un_sub('offers-recv-ch', this._processRealStateMessage);

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
  // @brief This method will add an offer to be displayed. We will apply here some
  //        rules and logic to see if we should or not show a particular offer.
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
  addOffer(offerInfo) {
    // check offer validity
    if (!offerInfo ||
        !offerInfo.offer_id ||
        !offerInfo.display_id ||
        !offerInfo.campaign_id) {
      lwarn('addOffer: invalid offer or missing fields');
      return false;
    }

    // check the status of the current offer if there is one
    if (this.isOfferActive(offerInfo.offer_id)) {
      lwarn('addOffer: we already have this offer active..');
      return false;
    }

    // check if we should or should not show this offer
    if (!this._shouldShowOffer(offerInfo)) {
      linfo(`addOffer: We should not show this offer with ID: ${offerInfo.offer_id}`);
      return false;
    }

    // we then need to add the offer to the DB and mark it as active
    if (this.offersDB.hasOfferData(offerInfo.offer_id)) {
      // try to update it just in case
      if (!this.offersDB.updateOfferObject(offerInfo.offer_id, offerInfo)) {
        lerr(`addOffer: Error updating the offer to the DB: ${offerInfo.offer_id}`);
        return false;
      }
    } else if (!this.offersDB.addOfferObject(offerInfo.offer_id, offerInfo)) {
      // it is a new one
      // we cannot continue here since we depend on having the offer in the DB
      lerr(`addOffer: Error adding the offer to the DB: ${offerInfo.offer_id}`);
      return false;
    }

    // make offer active
    this.makeOfferActive(offerInfo.offer_id);

    // now we will publish the message notifying that we have a new offer
    const offerObject = this.offersDB.getOfferObject(offerInfo.offer_id);
    const msgData = {
      offer_id: offerObject.offer_id,
      offer_data: offerObject
    };

    // track some signals
    this.offersDB.incOfferAction(offerObject.offer_id, ActionID.AID_OFFER_ADDED);

    // to track we use the offer_id
    this.sigHandler.setCampaignSignal(offerObject.campaign_id,
                                      offerObject.offer_id,
                                      ORIGIN_ID,
                                      ActionID.AID_OFFER_ADDED);

    this.sigHandler.setCampaignSignal(offerObject.campaign_id,
                                      offerObject.offer_id,
                                      ORIGIN_ID,
                                      ActionID.AID_OFFER_DISPLAYED);

    // broadcast the message
    const realStatesDest = this._getDestRealStatesForOffer(offerObject.offer_id);
    this._publishMessage(MessageType.MT_NEW_OFFER_ACTIVE, realStatesDest, msgData);
    return true;
  }

  /**
   * check if an offer is active or not
   * @param  {[type]} offerID [description]
   * @return {[type]}         [description]
   */
  isOfferActive(offerID) {
    return this.activeOffers.has(offerID);
  }
  makeOfferActive(offerID) {
    this.activeOffers.add(offerID);
  }
  makeOfferInactive(offerID) {
    this.activeOffers.delete(offerID);
  }

  //
  // @brief update the rule information for an offer
  //
  displayOffer(offerID, displayInfo) {
    if (!offerID || !displayInfo) {
      lwarn('displayOffer: offer ID or displayInfo nulls?');
      return false;
    }
    if (!this.isOfferActive(offerID)) {
      lwarn(`displayOffer: we dont have an offer with id: ${offerID}`);
      return false;
    }

    const localOfferInfo = this.offersDB.getOfferObject(offerID);
    if (!localOfferInfo || !this._shouldShowOffer(localOfferInfo)) {
      linfo(`displayOffer: we should not show this offer with id: ${offerID}`);
      return false;
    }

    // track this signal
    const campaignID = this.offersDB.getCampaignID(offerID);
    this.sigHandler.setCampaignSignal(campaignID,
                                      offerID,
                                      ORIGIN_ID,
                                      ActionID.AID_OFFER_DISPLAYED);

    // broadcast the message
    const realStatesDest = this._getDestRealStatesForOffer(localOfferInfo.offer_id);
    const data = {
      offer_id: localOfferInfo.offer_id,
      display_rule: displayInfo,
      offer_data: localOfferInfo
    };
    this._publishMessage(MessageType.MT_DISPLAY_OFFER, realStatesDest, data);
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
   * @param  {[type]} args [description]
   * @return {[type]}      [description]
   */
  getStoredOffers(/* args */) {
    // for this first version we will just return all the offers directly
    const self = this;
    const rawOffers = this.offersDB.getOffers();
    const result = [];
    rawOffers.forEach((offerElement) => {
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

  // /////////////////////////////////////////////////////////////////////////////
  // internal methods


  /**
   * will close and offer with the given id, this will make the offer inactive
   * if it was
   * @param  {[type]} offerID [description]
   * @return {[type]}         [description]
   */
  _closeOffer(offerID) {
    const offerObj = this.offersDB.getOfferObject(offerID);
    if (!offerObj) {
      lwarn(`closeOffer: the offer ${offerID} is not on our DB`);
      return false;
    }

    // track signal
    const campaignID = this.offersDB.getCampaignID(offerID);
    this.sigHandler.setCampaignSignal(campaignID,
                                      offerID,
                                      ORIGIN_ID,
                                      ActionID.AID_OFFER_CLOSED);

    // we emit the event for the real states now
    const realStatesDest = this._getDestRealStatesForOffer(offerID);
    const data = { offer_id: offerID };
    this._publishMessage(MessageType.MT_CLOSE_OFFER, realStatesDest, data);

    if (this.isOfferActive(offerID)) {
      this.makeOfferInactive(offerID);
      // emit a message here
      this._publishMessage(MessageType.MT_OFFER_DEACTIVATED, realStatesDest, data);
    }

    return true;
  }

  //
  // @brief Remove a particular offer
  //
  _removeOffer(offerID) {
    const offerObj = this.offersDB.getOfferObject(offerID);
    if (!offerObj) {
      lwarn(`removeOffer: the offer ${offerID} is not on our DB`);
      return false;
    }

    // remove the offer from the DB
    if (!this.offersDB.removeOfferObject(offerID)) {
      lwarn(`removeOffer: failed removing the offer object from the DB ${offerID}`);
      return false;
    }

    // track signal
    const campaignID = this.offersDB.getCampaignID(offerID);
    this.sigHandler.setCampaignSignal(campaignID,
                                      offerID,
                                      ORIGIN_ID,
                                      ActionID.AID_OFFER_REMOVED);

    // we emit the event for the real states now
    const realStatesDest = this._getDestRealStatesForOffer(offerID);
    const data = { offer_id: offerID };
    this._publishMessage(MessageType.MT_REMOVE_OFFER, realStatesDest, data);

    if (this.isOfferActive(offerID)) {
      this.makeOfferInactive(offerID);
      // emit a message here
      this._publishMessage(MessageType.MT_OFFER_DEACTIVATED, realStatesDest, data);
    }

    return true;
  }

  /**
   * This method will process the messages coming from the real states or anyone
   * that will interact with the offers-core module
   * @param  {[type]} msg Is the object containing all the message information.
   *                      For more information check the documentation
   * @return {[type]}     [description]
   */
  _processRealStateMessage(msg) {
    // message:
    // {
    //    origin: who is sending it,
    //    type: message type, should be one of the one listed on the functions map
    //    data: {...},  object containing the data depending on the message type
    // }

    if (!msg || !msg.origin || !msg.type || !msg.data) {
      lerr('_processRealStateMessage: invalid message format, discarding it');
      return false;
    }

    // check if we have the associated function
    const handlerFun = this.uiActionsMap[msg.type];
    if (!handlerFun) {
      lwarn(`_processRealStateMessage: we cannot process the message type ${msg.type}`);
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
      lerr('_shouldShowOffer: the offer is null');
      return false;
    }
    const rules = offerInfo.filter_info;
    const offerID = offerInfo.offer_id;
    return this.filterRuleEval.shouldWeShowOffer(offerID, rules);
  }

  _getDestRealStatesForOffer(offerID) {
    const offerObj = this.offersDB.getOfferObject(offerID);
    if (!offerObj || !offerObj.rs_des) {
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
    if (isChromium && type === MessageType.MT_NEW_OFFER_ACTIVE) {
      const offerInfoCpy = data.offer_data;
      linfo(`_publishMessage: sending offer active for offerID: ${offerInfoCpy.display_id}`);
      let urlsToShow = null;
      if (data.offer_data.rule_info && data.offer_data.rule_info.url) {
        urlsToShow = data.offer_data.rule_info.url;
      }
      events.pub('msg_center:show_message', {
        id: offerInfoCpy.display_id,
        Message: offerInfoCpy.ui_info.template_data.title,
        Link: offerInfoCpy.ui_info.template_data.call_to_action.url,
        LinkText: offerInfoCpy.ui_info.template_data.call_to_action.text,
        type: 'offers',
        origin: 'cliqz',
        data: {
          offer_info: {
            offer_id: data.offer_data.offer_id,
            offer_urls: urlsToShow
          }
        }
      }, 'ghostery');
      return;
    }

    // this will be the normal case
    const message = {
      origin: 'offers-core',
      type,
      dest: destList,
      data,
    };
    events.pub('offers-send-ch', message);
  }


  // ///////////////////////////////////////////////////////////////////////////
  // actions from ui

  _uiFunCallToAction(msg) {
    // check offer
    if (!msg.data || !msg.data.offer_id) {
      lwarn(`_uiFunCallToAction: invalid format of the message: ${JSON.stringify(msg)}`);
      return false;
    }

    // get the data
    const offerID = msg.data.offer_id;
    const campaignID = this.offersDB.getCampaignID(offerID);
    const offerInfo = this.offersDB.getOfferObject(offerID);
    if (!offerInfo) {
      lwarn(`_uiFunCallToAction: we dont have an active offer with id: ${offerID}`);
      return false;
    }
    // increment the signal here
    linfo(`_uiFunCallToAction: called for offer id: ${offerID}`);
    this.offersDB.incOfferAction(offerID, ActionID.AID_OFFER_CALL_TO_ACTION);
    this.sigHandler.setCampaignSignal(campaignID,
                                      offerID,
                                      msg.origin,
                                      ActionID.AID_OFFER_CALL_TO_ACTION);

    // execute the action if we have one
    if (offerInfo.action_info && offerInfo.action_info.on_click) {
      openNewTabAndSelect(offerInfo.action_info.on_click);
    } else {
      linfo('_uiFunCallToAction: no action_info defined for this offer');
    }
    return true;
  }

  _uiFunCloseOffer(msg) {
    if (!msg.data || !msg.data.offer_id) {
      lwarn(`_uiFunCloseOffer: invalid format of the message: ${JSON.stringify(msg)}`);
      return false;
    }
    const offerID = msg.data.offer_id;
    const campaignID = this.offersDB.getCampaignID(offerID);
    linfo(`_uiFunCloseOffer: called for offer id: ${offerID}`);
    this.sigHandler.setCampaignSignal(campaignID, offerID, msg.origin, ActionID.AID_OFFER_CLOSED);
    this.offersDB.incOfferAction(offerID, ActionID.AID_OFFER_CLOSED);

    return this._closeOffer(offerID);
  }

  _uiFunRemoveOffer(msg) {
    if (!msg.data || !msg.data.offer_id) {
      lwarn(`_uiFunRemoveOffer: invalid format of the message: ${JSON.stringify(msg)}`);
      return false;
    }
    const offerID = msg.data.offer_id;
    const campaignID = this.offersDB.getCampaignID(offerID);
    linfo(`_uiFunRemoveOffer: called for offer id: ${offerID}`);
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
      lwarn(`_uiFunActionSignal: data: ${msg.data} are invalid`);
      return false;
    }
    // we will send the new signal here depending on the action id:
    this.sigHandler.setActionSignal(msg.data.action_id, msg.origin);

    return true;
  }

  _uiFunOffersStateChanged(msg) {
    if (!msg.data || !msg.data.offers_ids || !msg.data.new_state) {
      lwarn(`_uiFunOffersStateChanged: invalid arguments: ${JSON.stringify(msg)}`);
      return false;
    }

    // for each of the offers we now set the new state
    let somethingModified = false;
    const self = this;
    msg.data.offers_ids.forEach((oid) => {
      const campaignID = this.offersDB.getCampaignID(oid);
      if (!campaignID) {
        lwarn(`_uiFunOffersStateChanged: offer with ID ${oid} is not present?`);
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
      lwarn(`_uiFunOfferActionSignal: invalid arguments: ${JSON.stringify(msg)}`);
      return false;
    }
    const offerID = msg.data.offer_id;
    const campaignID = this.offersDB.getCampaignID(offerID);
    if (!campaignID) {
      lwarn(`_uiFunOfferActionSignal: no campaign id for offer ${offerID}`);
      return false;
    }

    // send signal and add it as action on the offer list
    this.sigHandler.setCampaignSignal(campaignID, offerID, msg.origin, msg.data.action_id);
    this.offersDB.incOfferAction(offerID, msg.data.action_id);

    return true;
  }


}
