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
    this.patterns = null;
  }

  isBuilt() {
    return !!this.patterns;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 2) {
      throw new Error('MatchExpr invalid args');
    }
    // we must ensure that is a list here, if not will fail
    this.patterns = [];
    // 04.10.2017 This loop starts from 1 to be compatible with the current trigger version,
    // we have to coordinate with new trigger version and change this.
    for (let i = 1; i < this.data.raw_op.args.length; i += 1) {
      this.patterns.push(this.data.raw_op.args[i]);
    }
  }

  destroy() {
  }

  getExprValue(ctx) {
    const currUlr = ctx['#lc_url'];
    let matched = false;
    for (let i = 0; i < this.patterns.length; i += 1) {
      const regex = this.data.regex_cache.getRegexp(this.patterns[i]);
      if (regex !== null && regex.test(currUlr)) {
        matched = true;
        break;
      }
    }
    return Promise.resolve(matched);
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
    this.timeRange = null;
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
    this.timeRange = Number(args.time_range);
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
      tokenData => this.data.query_handler.matchTokens(tokenData, this.timeRange)
    );

    return Promise.resolve(thereIsAMatch);
  }
}

/**
 * this method will check if the user is in a particular area / place
 * @param  {Object} args
 * <pre>
 * {
 *   // this flag will be used to decide what we should use to check the location
 *   // as first option, if not available we check the second option.
 *   main_check: 'locs' | 'coords'
 *
 *   // coords checker information, basically a list of possible locations
 *   // and distances. If any of those matches => we return true
 *   //
 *   coords: [
 *     {long: X, lat: Y, d_km: Z},
 *     ...
 *   ],
 *
 *   // the locations information that we want to check, if any of those matches
 *   // then we return true.
 *   locs: {
 *     country_id: {
 *       cities: {
 *         city_id: [postal_code1, postal_code2, ...]
 *       }
 *     }
 *   }
 * }
 * </pre>
 * @return {[Promise[boolean]]} async return whether there is a match or not
 * @version 3.0
 */
class GeoCheckExpr extends Expression {
  constructor(data) {
    super(data);
    this.args = null;
  }

  isBuilt() {
    return this.args !== null;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 1) {
      throw new Error('GeoCheckExpr invalid args');
    }
    const args = this.data.raw_op.args[0];
    if (!args.main_check || (args.main_check !== 'locs' && args.main_check !== 'coords')) {
      throw new Error('GeoCheckExpr invalid args for field main_check');
    }

    // check we have the default one at least
    if (args.main_check === 'locs') {
      if (!args.locs) {
        throw new Error('GeoCheckExpr invalid args: locs is missing?');
      }
    } else if (!args.coords) {
      throw new Error('GeoCheckExpr invalid args: coords is missing?');
    }

    this.args = args;
  }

  destroy() {
  }

  getExprValue(/* ctx */) {
    try {
      // get the geo checker feature and check if it is available
      if (!this.data.feature_handler.isFeatureAvailable('geo')) {
        // for now we will not do anything
        return Promise.resolve(false);
      }
      const geoChecker = this.data.feature_handler.getFeature('geo');

      if (this.args.main_check === 'coords') {
        logger.error('We do not support coords yet');
        return Promise.resolve(false);
      }
      if (!geoChecker.isLocAvailable()) {
        // TODO: we can switch to the next check type
        return Promise.resolve(false);
      }
      // check check using the locs (we can maybe prebuilt this before)
      const countries = Object.keys(this.args.locs);
      for (let i = 0; i < countries.length; i += 1) {
        const country = countries[i];
        const cmap = this.args.locs[country];
        const cities = Object.keys(cmap);
        for (let j = 0; j < cities.length; j += 1) {
          const city = cities[j];
          const postals = cmap[city];
          if (!postals || postals.length === 0) {
            const info = { country, city };
            if (geoChecker.isSameLocation(info)) {
              // finish automatically
              return Promise.resolve(true);
            }
          } else {
            for (let k = 0; k < postals.length; k += 1) {
              const info = { country, city, zip: postals[k] };
              if (geoChecker.isSameLocation(info)) {
                // finish automatically
                return Promise.resolve(true);
              }
            }
          }
        }
      }
    } catch (e) {
      logger.error(`GeoCheckExpr error: ${JSON.stringify(e)}`);
    }
    return Promise.resolve(false);
  }
}

/**
 * This method will check if a particular feature is enabled or not and will
 * return true | false depending on that.
 * @param  {Object} The argument will be an object as follow
 * <pre>
 * {
 *   name: 'the_feature_name_to_check'
 * }
 * @return {[Promise[boolean]]} async returns true if the feature is enabled or not
 * @version 3.0
 */
class IsFeatureEnabledExpr extends Expression {
  constructor(data) {
    super(data);
    this.args = null;
  }

  isBuilt() {
    return this.args;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 1) {
      throw new Error('IsFeatureEnabledExpr invalid args');
    }
    const args = this.data.raw_op.args[0];
    if (!args.name) {
      throw new Error('IsFeatureEnabledExpr invalid args: name should be present');
    }
    this.args = args;
  }

  destroy() {
  }

  getExprValue(/* ctx */) {
    let exists = false;
    try {
      exists = this.data.feature_handler.isFeatureAvailable(this.args.name);
    } catch (e) {
      logger.error('IsFeatureEnabledExpr exception: ', e);
    }
    return Promise.resolve(exists);
  }
}


/**
 * This operation will be the new way we will performs checks, in the history and
 * in the current url, depending on the type of arguments we provide.
 * The operation will take one argument that will be the arguments associated to it:
 * @param  {Object} args is an array of objects
 * <pre>
 * {
 *   // this flag will define if we should check the current url or the history
 *   // note that if this is set to true all the history flags will be ignored.
 *   match_current: true | false,
 *
 *   // will define the patterns object used for matching
 *   patterns: {
 *     // this will identify this patters uniquely, meaning if something change
 *     // on the patterns this id will change as well. If two operations use
 *     // the same patterns the id should be the same (id = hash(patterns_list))
 *     pid: 'unique pattern id',
 *     p_list: [
 *       p1,
 *       p2,...
 *     ]
 *   },
 *
 *  // this attributes will make only sense if we are in history mode.
 *
 *  // which is the minimum expected number of matches to make the operation true
 *  // meaning if #of_matches >= min_expected => true
 *  min_matches_expected: 1,
 *
 *  // since how many seconds ago we want to check the history. This is relative
 *  // from NOW_secs - since_secs.
 *  since_secs: N,
 *  // till how many seconds ago (end time = NOW_secs - till_secs).
 *  till_secs: M,
 *
 *  // if this flag is present and set to X then we will cache the value once
 *  // of the operation if and only if (#of_matches >= min_expected == true)
 *  // for the following X seconds.
 *  // Note that this is not the same than caching the value of the operation
 *  // itself since we cache true and false at a trigger level.
 *  cache_if_match_value_secs: X,
 *
 * }
 * </pre>
 * @return {[Promise[boolean]]} async return whether there is a match or not
 * @version 3.0
 */
class PatternMatchExpr extends Expression {
  constructor(data) {
    super(data);
    this.args = null;
    this.isHistory = null;
    this.expireCache = null;
  }

  isBuilt() {
    return this.args !== null;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 1) {
      throw new Error('PatternMatchExpr invalid args');
    }
    // we check that we have the proper arguments
    const args = this.data.raw_op.args[0];
    if (!args.patterns || !args.patterns.pid || !args.patterns.p_list) {
      throw new Error('PatternMatchExpr invalid args, missing patterns?');
    }
    // check if it is history or not, this should be defined
    if (args.match_current === undefined) {
      throw new Error('PatternMatchExpr invalid args, match_current argument missing?');
    }
    this.isHistory = args.match_current === false;
    if (this.isHistory === true) {
      // check history arguments
      if (!(args.min_matches_expected > 0)) {
        throw new Error('PatternMatchExpr invalid args, min_matches_expected argument missing?');
      }
      if (args.since_secs === undefined || args.till_secs === undefined ||
          args.since_secs < args.till_secs) {
        throw new Error('PatternMatchExpr invalid args, since_secs or till_secs are wrong?');
      }
    }
    this.args = args;
  }

  destroy() {
  }

  getExprValue(ctx) {
    try {
      let result = false;
      if (this.isHistory === false) {
        result = this._matchCurrentUrl(ctx);
      } else if (this.isHistory === true) {
        result = this._matchHistory(ctx);
      }

      return Promise.resolve(result);
    } catch (e) {
      logger.error('PatternMatchExpr Error:', e);
      return Promise.reject(e);
    }
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Private methods
  //

  _matchCurrentUrl(ctx) {
    // get the #url_data
    const urlData = ctx['#url_data'];
    if (!urlData) {
      logger.error('We do not have the #url_data object?');
      return false;
    }
    const mhandler = this.data.pattern_matching_handler;
    return mhandler.itMatches(urlData.getPatternRequest(), this.args.patterns);
  }

  _matchHistory(/* ctx */) {
    const query = {
      since_secs: this.args.since_secs,
      till_secs: this.args.till_secs
    };

    // check if we have the cache flag activated, cache will be active only
    // if we matched and cache_if_match_value_secs > 0
    if (this.expireCache !== null && this.args.cache_if_match_value_secs > 0) {
      const lastStoredValSecs = (timestampMS() - this.expireCache) / 1000;
      if (lastStoredValSecs < this.args.cache_if_match_value_secs) {
        // we should return true here since we only cache when is true
        return true;
      }
    }
    // it is not cached check
    const handler = this.data.pattern_matching_handler;
    const historyMatchesCount = handler.countHistoryMatches(query, this.args.patterns);

    // check if it is partial
    const result = historyMatchesCount >= this.args.min_matches_expected;
    if (result && this.args.cache_if_match_value_secs > 0) {
      // cache the result
      this.expireCache = timestampMS();
    }
    return result;
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
  $match_query: MatchQueryExpr,
  $geo_check: GeoCheckExpr,
  $is_feature_enabled: IsFeatureEnabledExpr,
  $pattern_match: PatternMatchExpr
};

export default ops;
