/*
 * @brief Evaluate the filtering rules of a particular offer
 */

import LoggingHandler from '../logging_handler';
import OffersConfigs from '../offers_configs';
import HistorySignalID from './ui_offers_history';
import { UIOffersHistory } from './ui_offers_history';
import jsep from '../lib/jsep';



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
      not_added_mt: this._notAddedMt.bind(this),
      not_created_last_secs: this._notCreatedLastSecs.bind(this),
      not_timedout_mt: this._notTimedoutMt.bind(this),
      not_diplayed_mt: this._notDisplayedMt.bind(this),
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

    /*
      depending on the version of the triggers the rules can be object or string
      object is the previous version and has structure: {
        // show if not closed more than
        not_closed_mt: 3,
      }
      string is the new format and should be used from now on
     */

    if(rules.constructor === Object) {
      linfo("shouldWeShowOffer: rules is Object: \t Using old expression eval function");
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
    } else if (rules.constructor === String) {
      linfo("shouldWeShowOffer: rules is String: \t Using new expression eval function");
      let expr = jsep(rules); // parse rules string and create AST
      return this._evalExpression(expr);
    } else {
      lerr("shouldWeShowOffer: unknown rules format #shouldWeShowOffer");
      return false;
    }

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
  
  _notDisplayedMt(offerID, notDisplayedMt) {

    const timesDisplayed = this.offersHistory.getHistorySignal(offerID,
                                                            HistorySignalID.HSIG_OFFER_DISPLAYED);

    if (timesDisplayed >= notDisplayedMt) {
      linfo('_notDisplayedMt: offer displayed more than ' + notDisplayedMt +
            ' (' + timesDisplayed + ')');
      return false;
    }
    return true;
  }

  _notAddedMt(offerID, notAddedMt) {
    const timesAdded = this.offersHistory.getHistorySignal(offerID,
                                                            HistorySignalID.HSIG_OFFER_ADDED);
    if (timesAdded >= notAddedMt) {
      linfo('_notAddedMt: offer added more than ' + notAddedMt +
            ' (' + timesAdded + ')');
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

  _evalExpression(expr) {
    try {
      linfo("current expr" + JSON.stringify(expr));
      if(expr.type === "CallExpression") {
        let callee = expr.callee.name;
        let args = expr.arguments[0].value;
        return this.filterEvalFunMap[callee](args);
      } else if (expr.type === "LogicalExpression" && expr.operator === "||") {
        return this._evalExpression(expr.left) || this._evalExpression(expr.right);
      } else if (expr.type === "LogicalExpression" && expr.operator === "&&") {
        return this._evalExpression(expr.left) && this._evalExpression(expr.right);
      }
    }
    catch (e) {
        lerr("expr failed: " + JSON.stringify(expr));
        lerr("with error message: " + e);
        return false;
    }

  }



};

