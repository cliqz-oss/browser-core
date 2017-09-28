import Expression from '../expression';
import utils from '../../../core/utils';
import logger from '../../common/offers_v2_logger';
import { timestampMS, weekDay, dayHour } from '../../utils';
import OffersConfigs from '../../offers_configs';


// Helper modules
function perfExprAnd(ctx, elemList, idx = 0) {
  if (!elemList || idx >= elemList.length) {
    return Promise.resolve(false);
  }
  const first = elemList[idx];
  return first.evalExpr(ctx).then((r) => {
    if (!r) {
      return Promise.resolve(false);
    }
    // if we are in the last case return
    if (elemList.length === (idx + 1)) {
      return Promise.resolve(true);
    }
    return perfExprAnd(ctx, elemList, idx + 1);
  });
}

function perfExprOr(ctx, elemList, idx = 0) {
  if (!elemList || idx >= elemList.length) {
    return Promise.resolve(false);
  }
  const first = elemList[idx];
  return first.evalExpr(ctx).then((r) => {
    if (r) {
      return Promise.resolve(true);
    }
    // if we are in the last case return
    if (elemList.length === (idx + 1)) {
      return Promise.resolve(false);
    }
    return perfExprOr(ctx, elemList, idx + 1);
  });
}

/**
 * This operation checks whether a particular pref is enabled or not.
 * @param {object} eventLoop
 * @param {list} args is a list of strings containing the pref as
 * first element and the expected value as second argument.
 * @return {Promise(Boolean)} String(getPref(args[0])) === String(args[1])
 * @version 1.0
 */
class IfPrefExpr extends Expression {
  constructor(data) {
    super(data);
    this.prefName = null;
    this.expectedVal = null;
  }

  isBuilt() {
    if (!this.prefName || !this.expectedVal) {
      return false;
    }
    return true;
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 2) {
      throw new Error('IfPrefExpr invalid args');
    }
    this.prefName = String(this.data.raw_op.args[0]);
    this.expectedVal = String(this.data.raw_op.args[1]);
  }

  destroy() {
  }

  getExprValue(/* ctx */) {
    const prefVal = utils.getPref(this.prefName, undefined);
    return Promise.resolve(prefVal === this.expectedVal);
  }
}

/**
 * Prints a message on the console
 * @param  {String} msg      the message to print on the console
 * @version 1.0
 */
class LogExpr extends Expression {

  isBuilt() {
    return true;
  }

  build() {
  }

  destroy() {
  }

  getExprValue(/* ctx */) {
    return new Promise((resolve) => {
      if (OffersConfigs.LOG_ENABLED &&
          this.data.raw_op.args &&
          this.data.raw_op.args.length > 0) {
        // TODO: replace with the new logger?
        logger.info('log_expr', `[trigger_id: ${this.data.parent_trigger.trigger_id}]: ${this.data.raw_op.args[0]}`);
      }
      return resolve(true);
    });
  }
}

/**
 * Do a AND logic operation between the list of arguments
 * @param  {list} args is the list of arguments we want to perform the AND. It will
 *                     perform the AND between all of them.
 * @return {Promise(Boolean)}      true if all args return true, false otherwise
 * @version 1.0
 */
class AndExpr extends Expression {
  constructor(data) {
    super(data);
    this.ops = null;
  }

  isBuilt() {
    return this.ops !== null;
  }

  build() {
    if (!this.data.raw_op.args) {
      throw new Error(`AndExpr invalid args: ${this.data.raw_op.args}`);
    }
    if (this.data.raw_op.args.length === 0) {
      this.ops = [];
      return;
    }
    // now we should build each operation
    const opList = [];
    this.data.raw_op.args.forEach((opArg) => {
      opList.push(this.data.exp_builder.createExp(opArg));
    });
    this.ops = opList;
  }

  destroy() {
  }

  getExprValue(ctx) {
    return perfExprAnd(ctx, this.ops);
  }
}

/**
 * Perform a OR logic operation over all the arguments provided
 * @param  {list} args the list of arguments we want to apply the OR operation.
 * @return {Promise(Boolean)}      true if any of the args is true, false otherwise
 * @version 1.0
 */
class OrExpr extends Expression {
  constructor(data) {
    super(data);
    this.ops = null;
  }

  isBuilt() {
    return this.ops !== null;
  }

  build() {
    if (!this.data.raw_op.args) {
      throw new Error('OrExpr invalid args');
    }
    if (this.data.raw_op.args.length === 0) {
      this.ops = [];
      return;
    }
    // now we should build each operation
    const opList = [];
    this.data.raw_op.args.forEach((opArg) => {
      opList.push(this.data.exp_builder.createExp(opArg));
    });
    this.ops = opList;
  }

  destroy() {
  }

  getExprValue(ctx) {
    return perfExprOr(ctx, this.ops);
  }
}

/**
 * Negates (boolean) a particular argument
 * @param  {Boolean} arg the boolean value we want to negate.
 * @return {Promise(Boolean)} the negated value of arg.
 * @version 1.0
 */
class NotExpr extends Expression {
  constructor(data) {
    super(data);
    this.exprToNegate = null;
  }

  isBuilt() {
    return this.exprToNegate !== null;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length === 0) {
      throw new Error('NotExpr invalid args');
    }
    this.exprToNegate = this.data.exp_builder.createExp(this.data.raw_op.args[0]);
  }

  destroy() {
  }

  getExprValue(ctx) {
    return this.exprToNegate.evalExpr(ctx).then(result => Promise.resolve(!result));
  }
}

/**
 * checks for equality of 2 arguments
 * @param  {anything} e1  The first element to check against the other
 * @param  {anything} e2  The second element to check against the other.
 * @return {Boolean} e1 === e2. Note that they should be of the same type or possible
 *                   to compare.
 * @version 1.0
 */
class EqExpr extends Expression {
  constructor(data) {
    super(data);
    this.lExpr = null;
    this.rExpr = null;
  }

  isBuilt() {
    return this.lExpr && this.rExpr;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 2) {
      throw new Error('EqExpr invalid args');
    }
    this.lExpr = this.data.exp_builder.createExp(this.data.raw_op.args[0]);
    this.rExpr = this.data.exp_builder.createExp(this.data.raw_op.args[1]);
  }

  destroy() {
  }

  getExprValue(ctx) {
    return Promise.all([this.lExpr.evalExpr(ctx), this.rExpr.evalExpr(ctx)]).then(
      result => Promise.resolve(result[0] === result[1]));
  }
}

/**
 * checks for greater than between 2 arguments
 * @param  {anything} e1  The first element to check against the other
 * @param  {anything} e2  The second element to check against the other.
 * @return {Boolean} e1 > e2. Note that they should be of the same type or possible
 *                   to compare.
 * @version 1.0
 */
class GtExpr extends Expression {
  constructor(data) {
    super(data);
    this.lExpr = null;
    this.rExpr = null;
  }

  isBuilt() {
    return this.lExpr && this.rExpr;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 2) {
      throw new Error('GtExpr invalid args');
    }
    this.lExpr = this.data.exp_builder.createExp(this.data.raw_op.args[0]);
    this.rExpr = this.data.exp_builder.createExp(this.data.raw_op.args[1]);
  }

  destroy() {
  }

  getExprValue(ctx) {
    return Promise.all([this.lExpr.evalExpr(ctx), this.rExpr.evalExpr(ctx)]).then(
      result => Promise.resolve(result[0] > result[1]));
  }
}

/**
 * checks for less than between 2 arguments
 * @param  {anything} e1  The first element to check against the other
 * @param  {anything} e2  The second element to check against the other.
 * @return {Boolean} e1 < e2. Note that they should be of the same type or possible
 *                   to compare.
 * @version 1.0
 */
class LtExpr extends Expression {
  constructor(data) {
    super(data);
    this.lExpr = null;
    this.rExpr = null;
  }

  isBuilt() {
    return this.lExpr && this.rExpr;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 2) {
      throw new Error('LtExpr invalid args');
    }
    this.lExpr = this.data.exp_builder.createExp(this.data.raw_op.args[0]);
    this.rExpr = this.data.exp_builder.createExp(this.data.raw_op.args[1]);
  }

  destroy() {
  }

  getExprValue(ctx) {
    return Promise.all([this.lExpr.evalExpr(ctx), this.rExpr.evalExpr(ctx)]).then(
      result => Promise.resolve(result[0] < result[1]));
  }
}

/**
 * check for text matching using normal regular expressions
 * @param  {String} text  The text we want to check against the regular expressions.
 *                        This can be the url for example.
 * @param  {String(s)} regexes The list of strings (regexes) we will use to check the
 *                        text.
 * @return {Promise(Boolean)} true if any of the regexes matches the text, false otherwise
 * @version 1.0
 */
class MatchExpr extends Expression {
  constructor(data) {
    super(data);
    this.text = null;
    this.patterns = null;
  }

  isBuilt() {
    return this.text && this.patterns;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 2) {
      throw new Error('MatchExpr invalid args');
    }
    this.text = this.data.exp_builder.createExp(this.data.raw_op.args[0]);
    // we must ensure that is a list here, if not will fail
    this.patterns = [];
    for (let i = 1; i < this.data.raw_op.args.length; i += 1) {
      this.patterns.push(this.data.raw_op.args[i]);
    }
  }

  destroy() {
  }

  getExprValue(ctx) {
    return this.text.evalExpr(ctx).then((text) => {
      let matched = false;
      for (let i = 0; i < this.patterns.length; i += 1) {
        const regex = this.data.regex_cache.getRegexp(this.patterns[i]);
        if (regex !== null && regex.test(text)) {
          matched = true;
          break;
        }
      }
      return Promise.resolve(matched);
    });
  }
}

/**
 * return the current timestamo
 * @return {Number} current time (Date.now())
 * @version 1.0
 */
class TimestampExpr extends Expression {

  isBuilt() {
    return true;
  }

  build() {
  }

  destroy() {
  }

  getExprValue(/* ctx */) {
    return Promise.resolve(timestampMS());
  }
}

/**
 * returns the current hour of the current time
 * @return {Number} current hour
 * @version 1.0
 */
class DayHourExpr extends Expression {

  isBuilt() {
    return true;
  }

  build() {
  }

  destroy() {
  }

  getExprValue(/* ctx */) {
    return Promise.resolve(dayHour());
  }
}

/**
 * return the current week day
 * @return {number} returns the current week day number
 * (1-Sunday, 2-Monday, ... 7-Saturday)
 * @version 1.0
 */
class WeekDayExpr extends Expression {

  isBuilt() {
    return true;
  }

  build() {
  }

  destroy() {
  }

  getExprValue(/* ctx */) {
    return Promise.resolve(weekDay());
  }
}

/**
 * this method is will check if a string matches a regex using the new approach
 * @param  {[type]} args [description]
 * @return {[type]}      [description]
 * @version 1.0
 */
class MatchRegexExpr extends Expression {
  constructor(data) {
    super(data);
    this.patternsObj = null;
    this.urlExpr = null;
  }

  isBuilt() {
    return this.urlExpr && this.patternsObj;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 2) {
      throw new Error('MatchRegexExpr invalid args');
    }
    this.urlExpr = this.data.exp_builder.createExp(this.data.raw_op.args[0]);
    this.patternsObj = this.data.raw_op.args[1];
  }

  destroy() {
  }

  getExprValue(ctx) {
    return this.urlExpr.evalExpr(ctx).then((builtUrlData) => {
      // we now check if we already have built the regex object
      const opID = this.getHashID();
      let regBundleObj = this.data.regex_helper.getCachedRegexObject(opID);
      if (!regBundleObj) {
        if (!this.patternsObj || !this.patternsObj.regex) {
          return Promise.reject(new Error('Invalid arg, the regex patterns are not as expected the format'));
        }
        // build one and store it
        regBundleObj = this.data.regex_helper.compileRegexObject(this.patternsObj.regex);
        if (!regBundleObj) {
          return Promise.reject(new Error('something went wrong compiling the regex data'));
        }
        // cache it
        this.data.regex_helper.cacheRegexObject(opID, regBundleObj);
      }

      // now we test if matches or not
      const result = this.data.regex_helper.testRegex(builtUrlData, regBundleObj);
      return Promise.resolve(result);
    });
  }
}

/**
 * this method is will check if queried keywords matche a given condition
 * @param  {Array} args is an array of objects
 * <pre>
 * [
 *   {
 *     keywords_list: [],
 *     time_range: N,
 *   }
 * ]
 * </pre>
 * @param {Object} context contains query related information
 * <pre>
 *  {
 *   #domain: "google.de",
 *   #query_info: "",
 *   #referrer: "",
 *   #url: "url_string",
 *   #url_data: Object
 * }
 * </pre>
 * @return {[Promise[boolean]]} async return whether there is a match or not
 * @version 1.0
 */
class MatchQueryExpr extends Expression {
  constructor(data) {
    super(data);
    this.normalizedArgs = null;
  }

  isBuilt() {
    return this.normalizedArgs;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 1) {
      throw new Error('MatchQueryExpr invalid args');
    }
    const args = this.data.raw_op.args[0];
    if (!args.keywords_list) {
      throw new Error('MatchQueryExpr invalid args');
    }
    const normalizedKeywordData = [];
    args.keywords_list.forEach((rawTokenData) => {
      normalizedKeywordData.push(
        {
          contained: this.data.query_handler.normalizeTokenList(rawTokenData.keywords),
          filtered: this.data.query_handler.normalizeTokenList(rawTokenData.filter),
        }
      );
    });
    this.normalizedArgs = normalizedKeywordData;
  }

  destroy() {
  }

  getExprValue(ctx) {
    const queryInfo = ctx['#query_info'];
    if (!queryInfo) {
      return Promise.resolve(false);
    }

    const thereIsAMatch = this.normalizedArgs.some(
      tokenData => this.data.query_handler.matchTokens(tokenData, this.normalizedArgs.time_range)
    );

    return Promise.resolve(thereIsAMatch);
  }
}

const ops = {
  $if_pref: IfPrefExpr,
  $log: LogExpr,
  $and: AndExpr,
  $or: OrExpr,
  $not: NotExpr,
  $eq: EqExpr,
  $gt: GtExpr,
  $lt: LtExpr,
  $match: MatchExpr,
  $timestamp: TimestampExpr,
  $day_hour: DayHourExpr,
  $week_day: WeekDayExpr,
  $match_regex: MatchRegexExpr,
  $match_query: MatchQueryExpr
};

export default ops;
