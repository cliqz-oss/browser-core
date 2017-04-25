/*
 * @brief This will be the entry point for all the Offers to be shown. Here
 *        we will control all the display logic.
 */

import { utils } from '../../core/cliqz';
import LoggingHandler from '../logging_handler';
import OffersConfigs from '../offers_configs';
import { loadFileFromChrome } from '../utils';
import { UIDisplayManager } from './ui_display_manager';
import SignalType from './ui_display_manager';
import TrackSignalID from './ui_signals_handler';
import { UISignalsHandler } from './ui_signals_handler';
import HistorySignalID from './ui_offers_history';
import { UIOffersHistory } from './ui_offers_history';
import { openNewTabAndSelect } from '../utils';
import {UIFilterRulesEvaluator} from './ui_filter_rules_evaluator';
import events from '../../core/events';
import { isChromium } from '../../core/platform';

////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'ui_offer_processor';

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
export class UIOfferProcessor {

  //
  constructor(sigHandler, eventHandler) {
    // the display manager
    this.uiDisplayMngr = new UIDisplayManager(this.uiDisplayMngrSignalsCb.bind(this), eventHandler);
    // active offers (not mean being displayed)
    this.activeOffers = {};

    // offers history data (what the user saw, closed, etc)
    this.offersHistory = new UIOffersHistory();

    // filtering rules evaluator
    this.filterRuleEval = new UIFilterRulesEvaluator(this.offersHistory);

    // the action function map for signals coming from the UI (not tracking)
    // TODO: we should define here a hardcoded number of functions we will be
    //       able to track
    this.uiActionsMap = {
      'call-to-action': this._uiFunCallToAction.bind(this),
      'more-about-cliqz': this._uiFunMoreAboutCliqz.bind(this),
      'close-offer': this._uiFunCloseOffer.bind(this),
      'more-about-offer': this._uiFunMoreAboutOffer.bind(this),
    };

    // signal handler
    this.sigHandler = new UISignalsHandler(sigHandler);
  }

  destroy() {
    if (this.offersHistory) {
      this.offersHistory.destroy();
    }
    if (this.uiDisplayMngr) {
      this.uiDisplayMngr.destroy();
    }
    if (this.sigHandler) {
      this.sigHandler.destroy();
    }
    if (this.filterRuleEval) {
      this.filterRuleEval.destroy();
    }
  }

  ////////////////////////////////////////////////////////////////////////////////

  savePersistenceData() {
    // save all sub modules persistence data
    if (this.offersHistory) {
      this.offersHistory.savePersistenceData();
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
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
    if (!offerInfo ||
        (offerInfo.offer_id === undefined || offerInfo.offer_id === null) ||
        (offerInfo.display_id === undefined || offerInfo.display_id === null)) {
      lwarn('addOffer: no offer info provided? or null id? or null display_id');
      return;
    }

    if (this.activeOffers[offerInfo.offer_id]) {
      lwarn('we already have this offer active..');
      return;
    }

    // check if we should or should not show this offer
    if (!this._shouldShowOffer(offerInfo)) {
      linfo('We should not show this offer with ID: ' + offerInfo.offer_id);
      return;
    }

    // TODO: separate this properly and apply the logic we need here
    var offerInfoCpy = JSON.parse(JSON.stringify(offerInfo));
    const offerData = {
      id: offerInfoCpy.offer_id,
      template_name: offerInfoCpy.ui_info.template_name,
      template_data: offerInfoCpy.ui_info.template_data
    };

    if (isChromium) {
      events.pub('msg_center:show_message', {
        id: offerInfoCpy.display_id,
        Message: offerInfoCpy.ui_info.template_data.title,
        Link: offerInfoCpy.ui_info.template_data.call_to_action.text,
        LinkText: offerInfoCpy.ui_info.template_data.call_to_action.url
      }, 'ghostery');
    } else {
      this.uiDisplayMngr.addOffer(offerData, offerInfoCpy.rule_info);
    }

    this.activeOffers[offerInfoCpy.offer_id] = offerInfoCpy;

    // track the last time we show this particular offer and displayid
    const displayID = offerInfoCpy.display_id;
    this.offersHistory.incHistorySignal(offerInfoCpy.offer_id, HistorySignalID.HSIG_OFFER_ADDED);
    this.offersHistory.incHistorySignal(displayID, HistorySignalID.HSIG_OFFER_ADDED);

    // to track we use the offer_id
    this.sigHandler.trackOfferSignal(offerInfoCpy.offer_id, TrackSignalID.TSIG_OFFER_ADDED);
  }

  //
  // @brief check if we have an offer already or not
  //
  hasOffer(offerID) {
    return (this.activeOffers[offerID]) ? true : false;
  }

  //
  // @brief update the rule information for an offer
  //
  addRuleInfoForOffer(offerID, ruleInfo) {
    if (!offerID || !ruleInfo || !ruleInfo.type) {
      lwarn('updateUIInfoForOfer: offer ID or ruleInfo nulls?');
      return false;
    }
    if (!this.hasOffer(offerID)) {
      lwarn('updateUIInfoForOfer: we dont have an offer with id: ' + offerID);
      return false;
    }
    var currRuleInfo = this.getRuleInfoForOffer(offerID);
    if (!currRuleInfo || !currRuleInfo.type) {
      lerr('this should not happen...');
      return false;
    }
    // check if it is the same or we need to change it
    // TODO: not implemented yet supporting multiple rule types
    if (currRuleInfo.type !== ruleInfo.type) {
      lerr('TODO: we need to implement this in the future');
      return false;
    }

    // it is the same, we merge here and set it back
    var tmpUrls = new Set(currRuleInfo.url);
    for (var i = 0; i < ruleInfo.url.length; ++i) {
      tmpUrls.add(ruleInfo.url[i]);
    }
    var allUrls = [];
    tmpUrls.forEach(x => {allUrls.push(x);});

    // TODO: here we need to merge other fields or update the time as well, we
    // do not support this for now
    var newRuleInfo = Object.assign({}, currRuleInfo);
    newRuleInfo.url = allUrls;

    linfo('addRuleInfoForOffer: setting the new ruleinfo for the offer id ' + offerID);
    if (!this.uiDisplayMngr.setRuleInfoForOffer(offerID, newRuleInfo)) {
      lerr('addRuleInfoForOffer: error setting the new rule info');
      return false;
    }

    this.activeOffers[offerID].rule_info = newRuleInfo;
    return true;
  }

  //
  // @brief returns the current associated ui rule information of the given offer
  //        or null if no offer
  //
  getRuleInfoForOffer(offerID) {
    if (!this.hasOffer(offerID)) {
      return null;
    }
    return this.activeOffers[offerID].rule_info;
  }


  //
  // @brief Remove a particular offer
  //
  removeOffer(offerID) {
    // TODO: remove
    if (this.uiDisplayMngr.offerExists(offerID)) {
      this.uiDisplayMngr.removeOffer(offerID);
    }
    delete this.activeOffers[offerID];
  }

  ////////////////////////////////////////////////////////////////////////////////
  // signals connectors
  //

  // from core to display manager (we don't have to do anything here)
  onUICallback(data) {
    this.uiDisplayMngr.onUICallback(data);
  }

  // from display manager to here (callback)
  uiDisplayMngrSignalsCb(signalData) {
    linfo('signal callback received: ' + JSON.stringify(signalData));

    // TODO: do some proper checks here
    this._processUISignal(signalData.offer_id, signalData.signal_type, signalData.data);
  }

  ////////////////////////////////////////////////////////////////////////////////
  // internal methods

  // the processing methods should go here
  //
  _processUISignal(offerID, signalType, signalData) {
    const displayID = this._getDisplayIDFromOfferID(offerID);
    switch (signalType) {
      case SignalType.OFFER_DISPLAYED:
        //
        this.sigHandler.trackOfferSignal(offerID, TrackSignalID.TSIG_OFFER_SHOWN);
        this.offersHistory.incHistorySignal(displayID, HistorySignalID.HSIG_OFFER_SHOWN);
        this.offersHistory.incHistorySignal(offerID, HistorySignalID.HSIG_OFFER_SHOWN);
      break;

      case SignalType.OFFER_HIDE:
        this.sigHandler.trackOfferSignal(offerID, TrackSignalID.TSIG_OFFER_HIDE);
      break;

      case SignalType.OFFER_DISPLAY_TIMEOUT:
        // increase the times of closed?
        this.offersHistory.incHistorySignal(displayID, HistorySignalID.HSIG_OFFER_TIMEOUT);
        this.offersHistory.incHistorySignal(offerID, HistorySignalID.HSIG_OFFER_TIMEOUT);
        this.sigHandler.trackOfferSignal(offerID, TrackSignalID.TSIG_OFFER_TIMEOUT);
        // remove the offer from active ones
        this.removeOffer(offerID);
      break;

      case SignalType.UI_EVENT:
        // we need to process the type of signal and decide what to do here
        if (signalData.evt_type === 'button_pressed') {
          // process the action
          var actionFun = this.uiActionsMap[signalData.element_id];
          if (!actionFun) {
            lerr('_processUISignal: we dont have a function to process the action: ' +
                 signalData.element_id);
          } else {
            actionFun(offerID, signalData);
          }
        }
      break;

      default:
        lerr('_processUISignal: cannot process the unknown signal: ' + signalType);
    }
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
    const offerDisplayID = offerInfo.display_id;
    return this.filterRuleEval.shouldWeShowOffer(offerDisplayID, rules);
  }

  //
  // return the display id from an offer id
  //
  _getDisplayIDFromOfferID(offerID) {
    const offerInfo = this.activeOffers[offerID];
    if (!offerInfo) {
      return null;
    }
    return offerInfo.display_id;
  }

  //////////////////////////////////////////////////////////////////////////////
  // actions from ui

  _uiFunCallToAction(offerID, data) {
    const offerInfo = this.activeOffers[offerID];
    if (!offerInfo) {
      lwarn('_uiFunCallToAction: we dont have an active offer with id: ' + offerID);
      return;
    }
    linfo('_uiFunCallToAction: called for offer id: ' + offerID);
    this.sigHandler.trackOfferSignal(offerID, TrackSignalID.TSIG_OFFER_CALL_TO_ACTION);

    // execute the action if we have one
    if (offerInfo.action_info && offerInfo.action_info.on_click) {
      openNewTabAndSelect(offerInfo.action_info.on_click);
    } else {
      linfo('_uiFunCallToAction: no action_info defined for this offer');
    }
  }

  _uiFunMoreAboutCliqz(offerID, data) {
    linfo('_uiFunMoreAboutCliqz: called for offer id: ' + offerID);
    this.sigHandler.trackOfferSignal(offerID, TrackSignalID.TSIG_OFFER_MORE_INFO);
    openNewTabAndSelect(OffersConfigs.OFFER_INFORMATION_URL);
  }

  _uiFunCloseOffer(offerID, data) {
    linfo('_uiFunCloseOffer: called for offer id: ' + offerID);
    this.sigHandler.trackOfferSignal(offerID, TrackSignalID.TSIG_OFFER_CLOSED);
    const displayID = this._getDisplayIDFromOfferID(offerID);
    this.offersHistory.incHistorySignal(displayID, HistorySignalID.HSIG_OFFER_CLOSED);
    this.offersHistory.incHistorySignal(offerID, HistorySignalID.HSIG_OFFER_CLOSED);

    // close the offer?
    this.removeOffer(offerID);
  }

  _uiFunMoreAboutOffer(offerID, data) {
    // TODO:
    linfo('_uiFunMoreAboutOffer: called for offer id: ' + offerID);
    this.sigHandler.trackOfferSignal(offerID, TrackSignalID.TSIG_OFFER_MORE_ABT_CLIQZ);
  }


}
