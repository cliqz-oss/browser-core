import networkFiltersOptimizer from '../../core/adblocker-base/optimizer';
import { matchNetworkFilter } from '../../core/adblocker-base/filters-matching';
import { parseFilter } from '../../core/adblocker-base/filters-parsing';
import ReverseIndex from '../../core/adblocker-base/reverse-index';
import logger from '../common/offers_v2_logger';
import PatternHistoryMatching from './history-pattern-matching';


/**
 * Accelerating data structure for network filters matching. Makes use of the
 * reverse index structure defined above.
 */
class PatternIndex {
  constructor(filters) {
    this.index = new ReverseIndex(
      filters,
      filter => filter.getTokens(),
      { optimizer: networkFiltersOptimizer },
    );
  }

  optimizeAheadOfTime() {
    this.index.optimizeAheadOfTime();
  }

  /**
   * we will check if the request matches the patterns associated.
   * @param  {[type]} url         [description]
   * @return {[type]}             the set of patterns id that matched this url
   */
  match(request) {
    let matched = false;
    const checkMatch = (pattern) => {
      matched = matchNetworkFilter(pattern, request);

      // returning true we will continue iterating but is not needed anymore
      return !matched;
    };

    this.index.iterMatchingFilters(request.tokens, checkMatch);

    return matched;
  }
}


/**
 * This class will handle all the queries and everything that can be related to
 * pattern matching algorithms.
 * On the bottom will use the adblocker ReverseIndex and utils for doing the match.
 */
export default class PatternMatchingHandler {
  constructor(featureHandler) {
    // the cache of pid -> data:
    // {
    //  pi: the pattern index (PatternIndex) associated to this pid.
    // }
    this.cache = new Map();

    // check if we have history feature
    const historyFeature = featureHandler.isFeatureAvailable('history') ?
                           featureHandler.getFeature('history') :
                           null;
    this.historyMatch = new PatternHistoryMatching(historyFeature, this.itMatches.bind(this));
  }

  /**
   * will check if the pattern object matches a given tokenized url
   * @param  {[type]} toknezedURL [description]
   * @param  {Object} patternObj
   *   patternObj: {
   *     // this will identify this patters uniquely, meaning if something change
   *     // on the patterns this id will change as well. If two operations use
   *     // the same patterns the id should be the same (id = hash(patterns_list))
   *     pid: 'unique pattern id',
   *     // the list of associated patterns
   *     p_list: [
   *       p1,
   *       p2,...
   *     ]
   *   },
   * @return {Object}   We will return an object with the follow information:
   * {
   *   // will return if the current data is partial or not
   *   is_partial: true | false,
   *   // the data (or null if any) associated for the given query:
   *   data: {
   *     // the number of matches we have
   *     matches: N,
   *
   *   }
   * }
   */
  itMatches(tokenizedURL, patternObj) {
    if (!tokenizedURL || !this._checkPatternObj(patternObj)) {
      logger.error('Invalid tokenizedURL or patternObject');
      return false;
    }
    // check if we have a cache for this object already
    const ce = this._getOrCreateIndex(patternObj);
    if (!ce) {
      return false;
    }
    return ce.pi.match(tokenizedURL);
  }

  /**
   * Will count the number of matches for a given pattern list and a query
   * on the history. Check history-pattern-matching for more information
   * @return number of matches for that given period of time
   */
  countHistoryMatches(query, patternObj) {
    return this.historyMatch.countMatches(query, patternObj);
  }

  trackTokenizedUrlOnMem(tokenizedURL) {
    this.historyMatch.trackTokenizedUrlOnMem(tokenizedURL);
  }

  // ///////////////////////////////////////////////////////////////////////////

  _checkPatternObj(po) {
    return (po !== undefined && po !== null) && po.pid &&
      (po.p_list && po.p_list.length > 0);
  }

  _buildPattern(po) {
    const plist = [];
    for (let i = 0; i < po.p_list.length; i += 1) {
      const filter = parseFilter(po.p_list[i], true, false);
      if (filter) {
        plist.push(filter);
      } else {
        logger.error('Error parsing the filter: ', filter);
      }
    }
    return new PatternIndex(plist);
  }

  _getOrCreateIndex(po) {
    if (!this.cache.has(po.pid)) {
      const patternIndex = this._buildPattern(po);
      if (!patternIndex) {
        return null;
      }
      const cacheEntry = {
        pi: patternIndex
      };
      this.cache.set(po.pid, cacheEntry);
    }
    return this.cache.get(po.pid);
  }
}
