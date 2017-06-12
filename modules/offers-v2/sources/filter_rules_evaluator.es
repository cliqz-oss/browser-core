/*
 * @brief Evaluate the filtering rules of a particular offer
 */

import LoggingHandler from './logging_handler';
import ActionID from './actions_defs';
import jsep from './lib/jsep';

// /////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'filter_rules_evaluator';


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


// /////////////////////////////////////////////////////////////////////////////
export default class FilterRulesEvaluator {

  //
  constructor(offersDB) {
    this.offersDB = offersDB;
    // filter actions
    this.filterEvalFunMap = {
      not_closed_mt: this._notClosedMt.bind(this),
      not_added_mt: this._notAddedMt.bind(this),
      not_created_last_secs: this._notCreatedLastSecs.bind(this),
      not_clicked_last_secs: this._notClickedLastSecs.bind(this),
      not_timedout_mt: this._notTimedoutMt.bind(this),
      not_diplayed_mt: this._notDisplayedMt.bind(this),
      not_removed_last_secs: this._notRemovedLastSecs.bind(this)
    };
  }

  destroy() {
    // nothing to do
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                                API
  // ///////////////////////////////////////////////////////////////////////////

  shouldWeShowOffer(offerID, rules) {
    if (!offerID) {
      lwarn('shouldWeShowOffer: undefined offer ID');
      return false;
    }

    // if we dont have rules or the offer has no actions then we can just return
    if (!rules || !this.offersDB.hasOfferData(offerID)) {
      linfo(`shouldWeShowOffer: no rules or no actions for offer ${offerID}`);
      return true;
    }

    // get the displayID as well
    const offerObj = this.offersDB.getOfferObject(offerID);
    const offerDisplayID = offerObj ? offerObj.display_id : null;

    linfo(`shouldWeShowOffer: rules[${offerID}]: ${JSON.stringify(rules)}`);

    /*
      depending on the version of the triggers the rules can be object or string
      object is the previous version and has structure: {
        // show if not closed more than
        not_closed_mt: 3,
      }
      string is the new format and should be used from now on
     */

    if (rules.constructor === Object) {
      linfo('shouldWeShowOffer: rules is Object: \t Using old expression eval function');
      // show if all the conditions are true
      const self = this;
      let someFailed = false;
      Object.keys(rules).forEach((ruleName) => {
        if (someFailed) {
          return;
        }
        const ruleFun = self.filterEvalFunMap[ruleName];
        if (!ruleFun) {
          lerr('shouldWeShowOffer: one of the rules specified on the offer is not ' +
               `yet implemented. Filter Rule name: ${ruleName}. Skipping this one`);
          return;
        }
        if (!ruleFun(offerID, offerDisplayID, rules[ruleName])) {
          linfo(`shouldWeShowOffer: filter rule ${ruleName} didnt passed. We should ` +
                `not show this offer with ID ${offerID}`);
          someFailed = true;
        }
        // rule passed, check the next
      });

      return !someFailed;
    } else if (rules.constructor === String) {
      linfo('shouldWeShowOffer: rules is String: \t Using new expression eval function');
      const expr = jsep(rules); // parse rules string and create AST
      return this._evalExpression(expr);
    }

    lerr('shouldWeShowOffer: unknown rules format #shouldWeShowOffer');
    return false;
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                            PRIVATE METHODS
  // ///////////////////////////////////////////////////////////////////////////

  _notClosedMt(offerID, offerDisplayID, notClosedMt) {
    const timesClosed = this.offersDB.getOfferDisplayActionMeta(offerDisplayID,
                                                                ActionID.AID_OFFER_CLOSED);
    if (!timesClosed) {
      return true;
    }

    if (timesClosed.count >= notClosedMt) {
      linfo(`_notClosedMt: offer closed more than ${notClosedMt} (${timesClosed.count})`);
      return false;
    }
    return true;
  }

  _notDisplayedMt(offerID, offerDisplayID, notDisplayedMt) {
    const timesDisplayed = this.offersDB.getOfferDisplayActionMeta(offerDisplayID,
                                                                   ActionID.AID_OFFER_DISPLAYED);
    if (!timesDisplayed) {
      return true;
    }

    if (timesDisplayed.count >= notDisplayedMt) {
      linfo(`_notDisplayedMt: offer displayed more than ${notDisplayedMt} (${timesDisplayed.count})`);
      return false;
    }
    return true;
  }

  _notAddedMt(offerID, offerDisplayID, notAddedMt) {
    const timesAdded = this.offersDB.getOfferDisplayActionMeta(offerDisplayID,
                                                               ActionID.AID_OFFER_ADDED);
    if (!timesAdded) {
      return true;
    }

    if (timesAdded.count >= notAddedMt) {
      linfo(`_notAddedMt: offer added more than ${notAddedMt} (${timesAdded.count})`);
      return false;
    }
    return true;
  }

  /**
   * Checks when the offer was used (clicked) for the last time (if it was at all),
   * and decides whether it should be shown again.
   * @param  {[type]} offerID  [description]
   * @param  {[type]} offerDisplayID  [description]
   * @param  {integer} notClickedLastSecs  how much time (in sec) should pass before
   *                                       showing an offer again after being clicked.
   * @return {boolean} true on success (show it) | false otherwise
   */
  _notClickedLastSecs(offerID, offerDisplayID, notClickedLastSecs) {
    const lastTimeClicked = this.offersDB.getOfferActionMeta(offerID,
                                                             ActionID.AID_OFFER_CALL_TO_ACTION);
    if (!lastTimeClicked) {
      return true;
    }
    if (lastTimeClicked.l_u_ts) {
      // calculate the time diff
      const lastTimeClickedSecs = (Date.now() - lastTimeClicked.l_u_ts) / 1000;
      if (lastTimeClickedSecs < notClickedLastSecs) {
        linfo(`_notClickedLastSecs: the offer was clicked ${lastTimeClickedSecs}` +
              ` seconds ago and the rule specifies: ${notClickedLastSecs}`);
        return false;
      }
    }
    return true;
  }

  _notCreatedLastSecs(offerID, offerDisplayID, notCreatedLastSecs) {
    const lastTimeAdded = this.offersDB.getOfferDisplayActionMeta(offerDisplayID,
                                                                  ActionID.AID_OFFER_ADDED);
    if (!lastTimeAdded) {
      return true;
    }

    if (lastTimeAdded.l_u_ts) {
      // calculate the time diff
      const lastTimeShownSecs = (Date.now() - lastTimeAdded.l_u_ts) / 1000;
      if (lastTimeShownSecs < notCreatedLastSecs) {
        linfo(`_notCreatedLastSecs: the offer was shown ${lastTimeShownSecs}` +
              ` seconds ago and the rule specifies: ${notCreatedLastSecs}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Checks when the offer was removed from a RE (like the Hub)
   * for the last time (if it was at all), and decides whether it should be shown again.
   * @param  {[type]} offerID  [description]
   * @param  {[type]} offerDisplayID  [description]
   * @param  {integer} notRemovedLastSecs  how much time (in sec) should pass before
   *                                       showing an offer again after being removed.
   * @return {boolean} true on success (show it) | false otherwise
   */
  _notRemovedLastSecs(offerID, offerDisplayID, notRemovedLastSecs) {
    const lastTimeRemoved = this.offersDB.getOfferActionMeta(offerID,
                                                             ActionID.AID_OFFER_REMOVED);
    if (!lastTimeRemoved) {
      return true;
    }
    if (lastTimeRemoved.l_u_ts) {
      // calculate the time diff
      const lastTimeRemovedSecs = (Date.now() - lastTimeRemoved.l_u_ts) / 1000;
      if (lastTimeRemovedSecs < notRemovedLastSecs) {
        linfo(`_notRemovedLastSecs: the offer was removed ${lastTimeRemovedSecs}` +
          ` seconds ago and the rule specifies: ${notRemovedLastSecs}`);
        return false;
      }
    }
    return true;
  }

  _notTimedoutMt(offerID, offerDisplayID, notTimedOutMt) {
    const timedOutCount = this.offersDB.getOfferDisplayActionMeta(offerDisplayID,
                                                                  ActionID.AID_OFFER_TIMEOUT);
    if (!timedOutCount) {
      return true;
    }

    if (timedOutCount.count >= notTimedOutMt) {
      linfo(`_notTimedoutMt: offer timed out more than ${notTimedOutMt}` +
            ` (${timedOutCount.count} )`);
      return false;
    }
    return true;
  }

  _evalExpression(expr) {
    try {
      linfo(`current expr ${JSON.stringify(expr)}`);
      if (expr.type === 'CallExpression') {
        const callee = expr.callee.name;
        const args = expr.arguments[0].value;
        return this.filterEvalFunMap[callee](args);
      } else if (expr.type === 'LogicalExpression' && expr.operator === '||') {
        return this._evalExpression(expr.left) || this._evalExpression(expr.right);
      } else if (expr.type === 'LogicalExpression' && expr.operator === '&&') {
        return this._evalExpression(expr.left) && this._evalExpression(expr.right);
      }
    } catch (e) {
      lerr(`expr failed: ${JSON.stringify(expr)}`);
      lerr(`with error message: ${e}`);
      return false;
    }
    return false;
  }
}

