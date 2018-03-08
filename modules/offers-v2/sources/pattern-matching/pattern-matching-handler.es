import { SimplePatternIndex, MultiPatternIndex } from './pattern-utils';
import { parseNetworkFilter } from '../../core/pattern-matching';
import logger from '../common/offers_v2_logger';
import PatternHistoryMatching from './history-pattern-matching';

/**
 * This class will handle all the queries and everything that can be related to
 * pattern matching algorithms.
 * On the bottom will use the pattern-matching ReverseIndex and utils for doing the match.
 */
export default class PatternMatchingHandler {
  constructor(featureHandler) {
    // the cache of pid -> data:
    // {
    //  pi: the pattern index (PatternIndex) associated to this pid.
    // }
    this.cache = new Map();

    // check if we have history feature
    const historyFeature = featureHandler.isFeatureAvailable('history')
      ? featureHandler.getFeature('history')
      : null;
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

  /**
   * will match a multi pattern object (check buildMultiPatternObject) against
   * a particular tokenized url and return the list of pattern ids that matched
   * the url
   */
  getMatchIDs(tokenizedURL, multiPatternObj) {
    return multiPatternObj.match(tokenizedURL);
  }

  /**
   * will build a pattern matching object with all the patterns and their
   * associated ids.
   * The patternsList should be as follow:
   * [
   *   {
   *     pid: 'id of the patterns',
   *     p_list: [ pattern1, pattern2,...]
   *   }
   * ]
   */
  buildMultiPatternObject(patternsList) {
    let allFilters = [];
    for (let i = 0; i < patternsList.length; i += 1) {
      const patternData = patternsList[i];
      allFilters = allFilters.concat(this._buildFilters(patternData, patternData.pid));
    }
    return new MultiPatternIndex(allFilters);
  }

  // ///////////////////////////////////////////////////////////////////////////

  _checkPatternObj(po) {
    return (po !== undefined && po !== null) && po.pid &&
      (po.p_list && po.p_list.length > 0);
  }

  _buildFilters(po, filterGroupID = null) {
    const plist = [];
    for (let i = 0; i < po.p_list.length; i += 1) {
      const filter = parseNetworkFilter(po.p_list[i], true, false);
      if (filter) {
        if (filterGroupID !== null) {
          filter.groupID = filterGroupID;
        }
        plist.push(filter);
      } else {
        logger.error('Error parsing the filter: ', filter);
      }
    }
    return plist;
  }

  _buildSimplePattern(po) {
    return new SimplePatternIndex(this._buildFilters(po));
  }

  _getOrCreateIndex(po) {
    if (!this.cache.has(po.pid)) {
      const patternIndex = this._buildSimplePattern(po);
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
