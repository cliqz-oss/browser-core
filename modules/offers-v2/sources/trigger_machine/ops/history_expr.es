import Expression from '../expression';
import { timestamp } from '../../utils';


/**
 * Will check in the history if there is any matching against a list of regular
 * expresions.
 * At the same time if there is will add the current url to the history.
 * We will analyze all the urls in a range of time (timestamps in seconds) [start, end]
 * @param  {Number} start   the start timestamp on seconds
 * @param  {Number} end     the end time timestamp on seconds
 * @param  {list} patterns  The list if patterns to check against (string regex)
 * @return {Number} the number of matches we have.
 * @todo We will make this deprecate soon after integrating the new regex algorithm.
 * @version 1.0
 */
class MatchHistoryExpr extends Expression {
  constructor(data) {
    super(data);
    this.start = null;
    this.end = null;
    this.patterns = null;
    this.regexesListCache = null;
  }

  isBuilt() {
    return (this.start !== null) && (this.end !== null) && (this.patterns !== null);
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 3) {
      throw new Error('MatchHistoryExpr invalid args');
    }
    this.start = this.data.raw_op.args[0];
    this.end = this.data.raw_op.args[1];
    this.patterns = [];
    for (let i = 2; i < this.data.raw_op.args.length; i += 1) {
      this.patterns.push(this.data.raw_op.args[i]);
    }
  }

  destroy() {
  }

  getExprValue(ctx) {
    if (!this.regexesListCache) {
      // we get all the regexes first
      this.regexesListCache = [];
      for (let i = 0; i < this.patterns.length; i += 1) {
        const r = this.data.regex_cache.getRegexp(this.patterns[i]);
        if (r !== null) {
          this.regexesListCache.push(r);
        }
      }
    }

    // add current url to history, if it matches same patterns
    const currUlr = ctx['#url'];
    if (currUlr) {
      for (let i = 0; i < this.regexesListCache.length; i += 1) {
        const re = this.regexesListCache[i];
        if (re && re.test(currUlr)) {
          this.data.history_index.addUrl(currUlr, ctx);
          break;
        }
      }
    }

    // now we ask for the cached versions
    const opID = this.getHashID();
    const ts = timestamp();
    const numMatches = this.data.history_index.countHistoryEntries(ts - this.start,
                                                                   ts - this.end,
                                                                   this.regexesListCache,
                                                                   opID);
    return Promise.resolve(numMatches);
  }
}


const ops = {
  $match_history: MatchHistoryExpr
};

export default ops;
