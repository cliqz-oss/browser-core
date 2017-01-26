/*
 * @brief Evaluate the filtering rules of a particular offer
 */

import LoggingHandler from 'offers-v2/logging_handler';
import OffersConfigs from 'offers-v2/offers_configs';
import HistorySignalID from 'offers-v2/ui/ui_offers_history';
import { UIOffersHistory } from 'offers-v2/ui/ui_offers_history';



////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'ui_filter_rules_evaluator';


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
export class UIFilterRulesEvaluator {

  //
  constructor(offersHistory) {
    this.offersHistory = offersHistory;
    // filter actions
    this.filterEvalFunMap = {
      not_closed_mt: this._notClosedMt.bind(this),
      not_created_last_secs: this._notCreatedLastSecs.bind(this),
      not_timedout_mt: this._notTimedoutMt.bind(this),
    }
  }

  destroy() {
    // nothing to do
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                API
  //////////////////////////////////////////////////////////////////////////////

  shouldWeShowOffer(offerID, rules) {
    if (!offerID) {
      lwarn('shouldWeShowOffer: undefined offer ID');
      return false;
    }

    // if we dont have rules or the offer has no history then we can just return
    if (!rules || !this.offersHistory.hasHistoryForOffer(offerID)) {
      linfo('shouldWeShowOffer: no rules or no history for offer ' + offerID);
      return true;
    }

    linfo('shouldWeShowOffer: rules[' + offerID + ']: ' + JSON.stringify(rules));

    // show if all the conditions are true
    for (var ruleName in rules) {
      if (!rules.hasOwnProperty(ruleName)) {
        continue;
      }
      var ruleFun = this.filterEvalFunMap[ruleName];
      if (!ruleFun) {
        lerr('shouldWeShowOffer: one of the rules specified on the offer is not ' +
             'yet implemented. Filter Rule name: ' + ruleName + '. Skipping this one');
        continue;
      }
      if (!ruleFun(offerID, rules[ruleName])) {
        linfo('shouldWeShowOffer: filter rule ' + ruleName + ' didnt passed. We should ' +
              'not show this offer with ID ' + offerID);
        return false;
      }
      // rule passed, check the next
    }

    // alles rules passed
    return true;
  }


  //////////////////////////////////////////////////////////////////////////////
  //                            PRIVATE METHODS
  //////////////////////////////////////////////////////////////////////////////

  _notClosedMt(offerID, notClosedMt) {
    const timesClosed = this.offersHistory.getHistorySignal(offerID,
                                                            HistorySignalID.HSIG_OFFER_CLOSED);
    if (timesClosed >= notClosedMt) {
      linfo('_notClosedMt: offer closed more than ' + notClosedMt +
            ' (' + timesClosed + ')');
      return false;
    }
    return true;
  }

  _notCreatedLastSecs(offerID, notCreatedLastSecs) {
    const lastTimeAdded =
      this.offersHistory.getLastUpdateOf(offerID, HistorySignalID.HSIG_OFFER_ADDED);
    if (lastTimeAdded) {
      // calculate the time diff
      const lastTimeShownSecs = (Date.now() - lastTimeAdded) / 1000;
      if (lastTimeShownSecs < notCreatedLastSecs) {
        linfo('_notCreatedLastSecs: the offer was shown ' + lastTimeShownSecs +
              ' seconds ago and the rule specifies: ' + notCreatedLastSecs);
        return false;
      }
    }
    return true;
  }

  _notTimedoutMt(offerID, notTimedOutMt) {
    const timedOutCount =
      this.offersHistory.getHistorySignal(offerID, HistorySignalID.HSIG_OFFER_TIMEOUT);
    if (timedOutCount >= notTimedOutMt) {
      linfo('_notTimedoutMt: offer timed out more than ' + notTimedOutMt +
          ' (' + timedOutCount + ')');
      return false;
    }
    return true;
  }



};

export default HistorySignalID;

