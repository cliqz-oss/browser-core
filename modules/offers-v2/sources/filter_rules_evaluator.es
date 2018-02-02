/*
 * @brief Evaluate the filtering rules of a particular offer
 */

import logger from './common/offers_v2_logger';
import jsep from '../platform/lib/jsep';

export default class FilterRulesEvaluator {
  //
  constructor(offersDB) {
    this.offersDB = offersDB;
    // filter actions
    this.filterEvalFunMap = {
      eval_expression: this._evalExpression.bind(this),
      generic_comparator: this._genericComparator.bind(this)
    };
    // predefined operators
    this.operationsMap = {
      '>=': this._gtOrEqTo.bind(this),
      '<=': this._lsOrEqTo.bind(this),
      '==': this._eqTo.bind(this),
      '!=': this._notEqTo.bind(this)
    };
  }

  destroy() {
    // nothing to do
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                                API
  // ///////////////////////////////////////////////////////////////////////////

  buildJsepRules(strRules) {
    if (!strRules) {
      return null;
    }
    try {
      return jsep(strRules);
    } catch (e) {
      logger.error(`jsep couldn't parse with error ${e}`);
    }
    return null;
  }
  shouldWeShowOffer(offerID, argRules) {
    const rules = argRules;
    if (!offerID) {
      logger.warn('shouldWeShowOffer: undefined offer ID');
      return false;
    }

    // if we dont have rules or the offer has no actions then we can just return
    if (!rules || !this.offersDB.hasOfferData(offerID)) {
      logger.info(`shouldWeShowOffer: no rules or no actions for offer ${offerID}`);
      return true;
    }

    // get the displayID as well
    const offerObj = this.offersDB.getOfferObject(offerID);
    const offerDisplayID = offerObj ? offerObj.display_id : null;
    /*
      depending on the version of the triggers the rules can be object or string
      object is the previous version and has structure: {
        // show if not closed more than
        not_closed_mt: 3,
      }
      string is the new format and should be used from now on
     */

    // show if all the conditions are true
    const self = this;
    let someFailed = false;
    Object.keys(rules).forEach((ruleName) => {
      if (someFailed) {
        return;
      }
      const ruleFun = self.filterEvalFunMap[ruleName];
      if (!ruleFun) {
        logger.warn('shouldWeShowOffer: one of the rules specified on the offer is not ' +
             `implemented. Filter Rule name: ${ruleName}. Skipping this one`);
        return;
      }
      if (!rules.jsep_built) {
        rules.jsep_built = self.buildJsepRules(rules[ruleName]);
        if (!rules.jsep_built) {
          someFailed = true;
          return;
        }
      }

      if (!ruleFun(offerDisplayID, rules.jsep_built)) {
        logger.info(`shouldWeShowOffer: filter rule ${ruleName} didnt passed. We should ` +
              `not show this offer with ID ${offerID}`);
        someFailed = true;
      }
      // rule passed, check the next
    });

    return !someFailed;
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                            PRIVATE METHODS
  // ///////////////////////////////////////////////////////////////////////////

  // Operators
  _gtOrEqTo(leftArg, rightArg) {
    logger.info(`_gtOrEqTo: evaluating ${leftArg} >= ${rightArg}`);
    return leftArg >= rightArg;
  }

  _lsOrEqTo(leftArg, rightArg) {
    logger.info(`_lsOrEqTo: evaluating ${leftArg} <= ${rightArg}`);
    return leftArg <= rightArg;
  }

  _eqTo(leftArg, rightArg) {
    logger.info(`_eqTo: evaluating ${leftArg} === ${rightArg}`);
    return leftArg === rightArg;
  }

  _notEqTo(leftArg, rightArg) {
    logger.info(`_notEqTo: evaluating ${leftArg} !== ${rightArg}`);
    return leftArg !== rightArg;
  }
  /**
   * Compares a given offer attribute to an input number
   * @param  {[type]} offerDisplayID  [description]
   * @param  {Object} args  contains the following 4 elements
   * * @param {string} action_id offer's action involved
   * * @param {string} att_type attribute to be evaluated (counter, c_ts, l_u_ts)
   * * @param {string} operator one of these: '>=', '<=', '==', '!='
   * * @param {integer} value numerical value to be compared to
   * @return {boolean} true on success (show it) | false otherwise
   * @version 1.0
   */
  _genericComparator(offerDisplayID, args) {
    const operation = this.operationsMap[args.operator];
    if (!operation) {
      logger.warn(`_genericComparator: This operation wasn't found ${args.operator}`);
      return false;
    }
    const offerAction = this.offersDB.getOfferDisplayActionMeta(
      offerDisplayID,
      args.action_id
    );
    if (!offerAction) {
      return true;
    }
    if (args.att_type === 'counter') {
      // compare counter of events
      return operation(offerAction.count, args.value);
    } else if (args.att_type === 'c_ts' || args.att_type === 'l_u_ts') {
      // calculate the time diff assuming args.att_type has the right name,
      // we could make a map to do this as well
      const timeDelta = (Date.now() - offerAction[args.att_type]) / 1000;
      return operation(timeDelta, args.value);
    }
    logger.warn(`_genericComparator: unknown attribute '${args.att_type}'`);
    return false;
  }

  _evalExpression(offerDisplayID, expr) {
    try {
      if (expr.type === 'CallExpression') {
        const callee = expr.callee.name;
        if (!this.filterEvalFunMap[callee]) {
          logger.warn(`_evalExpression: filter function ${callee} doesn't exist`);
          return false;
        }
        if (expr.arguments.length < 4) {
          logger.warn(`_evalExpression: not enough arguments (${expr.arguments.length})`);
          return false;
        }
        const args = {
          action_id: expr.arguments[0].value,
          att_type: expr.arguments[1].value,
          operator: expr.arguments[2].value,
          value: expr.arguments[3].value,
        };
        // if condition not fulfilled, save
        if (!this.filterEvalFunMap[callee](offerDisplayID, args)) {
          this.failed = args;
          return false;
        }
        return true;
      } else if (expr.type === 'LogicalExpression' && expr.operator === '||') {
        return (this._evalExpression(offerDisplayID, expr.left) ||
                this._evalExpression(offerDisplayID, expr.right));
      } else if (expr.type === 'LogicalExpression' && expr.operator === '&&') {
        return (this._evalExpression(offerDisplayID, expr.left) &&
                this._evalExpression(offerDisplayID, expr.right));
      }
    } catch (e) {
      logger.error(`expr failed: ${JSON.stringify(expr)}`);
      logger.error(`with error message: ${e}`);
      return false;
    }
    return false;
  }
}
