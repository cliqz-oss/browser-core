import Expression from '../expression';
import i18n from '../../../core/i18n';
import prefs from '../../../core/prefs';
import { deadline } from '../../../core/decorators';
import logger from '../../common/offers_v2_logger';
import { timestampMS, weekDay, dayHour } from '../../utils';
import { isThrottleError } from '../../common/throttle-with-rejection';


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
    const prefVal = prefs.get(this.prefName, undefined);
    return Promise.resolve(String(prefVal) === this.expectedVal);
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
      if (this.data.raw_op.args
          && this.data.raw_op.args.length > 0) {
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
      opList.push(this.data.exp_builder.createExp(opArg, this.data.parent_trigger));
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
      opList.push(this.data.exp_builder.createExp(opArg, this.data.parent_trigger));
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
    this.exprToNegate = this.data.exp_builder.createExp(
      this.data.raw_op.args[0],
      this.data.parent_trigger
    );
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
    this.lExpr = this.data.exp_builder.createExp(
      this.data.raw_op.args[0],
      this.data.parent_trigger
    );
    this.rExpr = this.data.exp_builder.createExp(
      this.data.raw_op.args[1],
      this.data.parent_trigger
    );
  }

  destroy() {
  }

  getExprValue(ctx) {
    return Promise.all([this.lExpr.evalExpr(ctx), this.rExpr.evalExpr(ctx)]).then(
      result => Promise.resolve(result[0] === result[1])
    );
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
    this.lExpr = this.data.exp_builder.createExp(
      this.data.raw_op.args[0],
      this.data.parent_trigger
    );
    this.rExpr = this.data.exp_builder.createExp(
      this.data.raw_op.args[1],
      this.data.parent_trigger
    );
  }

  destroy() {
  }

  getExprValue(ctx) {
    return Promise.all([this.lExpr.evalExpr(ctx), this.rExpr.evalExpr(ctx)]).then(
      result => Promise.resolve(result[0] > result[1])
    );
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
    this.lExpr = this.data.exp_builder.createExp(
      this.data.raw_op.args[0],
      this.data.parent_trigger
    );
    this.rExpr = this.data.exp_builder.createExp(
      this.data.raw_op.args[1],
      this.data.parent_trigger
    );
  }

  destroy() {
  }

  getExprValue(ctx) {
    return Promise.all([this.lExpr.evalExpr(ctx), this.rExpr.evalExpr(ctx)]).then(
      result => Promise.resolve(result[0] < result[1])
    );
  }
}

/**
 * Return the value of a variable, or
 * undefined or default value if no such variable.
 */
class GetVariableExpr extends Expression {
  constructor(data) {
    super(data);
    if (!this.data.raw_op.args || !this.data.raw_op.args.length) {
      throw new Error('VarValue invalid args');
    }
    this.varName = data.raw_op.args[0];
    this.defaultValue = data.raw_op.args[1];
  }

  isBuilt() {
    return !!this.varName;
  }

  build() {
  }

  destroy() {
  }

  getExprValue(ctx) {
    const rawValue = ctx.vars && ctx.vars[this.varName];
    return Promise.resolve(typeof rawValue === 'undefined' ? this.defaultValue : rawValue);
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
 * Operation `probe_segment` returns true/false if the category was
 * matched at least `min_matches` times during the last `duration_days`.
 *
 * Additionally, it sets the trigger variable `segment_confidence`.
 * The value is `0` if the category is not matched and the history
 * is not loaded. Otherwise the value is `1`.
 *
 * If history is not loaded yet, it loads it.
 *
 * ['$probe_segment', [
 *   'categoryName',
 *   {
 *     min_matches: 777,
 *     duration_days: 888
 *   }]];
 */

class ProbeSegmentExpr extends Expression {
  constructor(data) {
    super(data);
    this.categoryName = null;
    this.minMatches = 3;
    this.durationDays = 90;
    this.cachedResult = false;
    this.cacheSentinel = '';
  }

  isBuilt() {
    return Boolean(this.catName);
  }

  build() {
    const args = this.data.raw_op.args;
    if (!args) {
      throw new Error('$probe_segment: missed category arg');
    }

    const categoryName = args[0];
    if (typeof categoryName !== 'string') {
      throw new Error('$probe_segment: category name should be a string');
    }
    this.categoryName = categoryName;

    const filterArg = args[1] || {};
    let minMatches = Number.parseInt(filterArg.min_matches, 10);
    let durationDays = Number.parseInt(filterArg.duration_days, 10);
    if (minMatches <= 0) {
      logger.warn('$probe_segment: min_matches should be a positive number');
      minMatches = 0;
    }
    if (Number.isNaN(minMatches)) {
      logger.warn('$probe_segment: min_matches should be a number');
      minMatches = 0;
    }
    if (durationDays <= 0) {
      logger.warn('$probe_segment: duration_days should be a positive number');
      durationDays = 0;
    }
    if (Number.isNaN(durationDays)) {
      logger.warn('$probe_segment: duration_days should be a number');
      durationDays = 0;
    }
    this.minMatches = minMatches || this.minMatches;
    this.durationDays = durationDays || this.durationDays;
  }

  destroy() {
  }

  async getExprValue(ctx) {
    const categoryHandler = this.data.category_handler;
    const setConfidenceVariable = (confidence) => {
      ctx.vars.segment_confidence = confidence;
    };
    //
    // Get the category. If not found, there is no match
    //
    const cat = categoryHandler.getCategory(this.categoryName);
    if (!cat) {
      setConfidenceVariable(1);
      return false;
    }
    //
    // Return cached value
    //
    const curSentinel = cat.getCacheSentinel();
    if (this.cacheSentinel === curSentinel) {
      setConfidenceVariable(this.cachedConfidence);
      return this.cachedResult;
    }
    //
    // Match and load history if required
    //
    let [result, confidence] = cat.probe(this.minMatches, this.durationDays);
    if (!confidence) {
      //
      // We have to load the history, but we don't care much about it.
      // If we get the result fast, we will use it. Otherwise, the caller
      // get the result on next call to `$probe_segment`.
      //
      let isHistoryLoaded = false;
      const queryHistory = (async () => {
        await categoryHandler.importHistoricalData(cat);
        isHistoryLoaded = true;
      })();
      //
      // Wait only a little
      //
      const noticeIfFail = deadline(queryHistory, 50);
      try {
        await noticeIfFail;
      } catch (err) {
        //
        // Throttling is an expected behavior, propagate other errors
        //
        if (!isThrottleError(err)) {
          logger.warn(`$probe_segment, non-throttle error ${err}`);
          throw err;
        }
      }
      //
      // If history is loaded, match the category again
      //
      if (isHistoryLoaded) {
        [result, confidence] = cat.probe(this.minMatches, this.durationDays);
      }
    }
    //
    // Cache and return
    //
    this.cachedResult = result;
    this.cachedConfidence = confidence;
    this.cacheSentinel = curSentinel;
    // Cache only definitive results
    if (!confidence) {
      this.cacheSentinel = '';
    }
    setConfidenceVariable(confidence);
    return result;
  }
}

/**
 * This operation checks local language settings.
 * @param {object} eventLoop
 * @param {list} args is a list of strings containing allowed languages.
 * @return {Promise(Boolean)} local language is in the list.
 * @version 21.0
 */
class LangIsExpr extends Expression {
  constructor(data) {
    super(data);
    this.allowedLangs = null;
  }

  isBuilt() {
    return !!this.allowedLangs;
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 1) {
      throw new Error('LangExpr invalid args');
    }
    this.allowedLangs = this.data.raw_op.args.map(String);
  }

  destroy() {
  }

  getExprValue(/* ctx */) {
    const preferredLanguage = i18n.PLATFORM_LANGUAGE;
    if (this.allowedLangs.indexOf(preferredLanguage) < 0) {
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
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
  $get_variable: GetVariableExpr,
  $timestamp: TimestampExpr,
  $day_hour: DayHourExpr,
  $week_day: WeekDayExpr,
  $geo_check: GeoCheckExpr,
  $is_feature_enabled: IsFeatureEnabledExpr,
  $probe_segment: ProbeSegmentExpr,
  $lang_is: LangIsExpr,
};

export default ops;
