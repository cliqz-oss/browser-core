/**
 * @module offers-v2
 * @class PatternUtils
 * @static
 */
import {
  extractHostname as getHostname,
  getGeneralDomain as getDomain,
} from '../../core/tlds';

import logger from '../common/offers_v2_logger';
import PatternMatching from '../../platform/lib/adblocker';
import { MultiPatternIndex, SimplePatternIndex } from './pattern-utils-imp';


/**
 * this method will generate the proper structure we need to use when matching
 * later against the patterns. This will build the "tokenizedURL object"
 *
 * @method tokenizeUrl
 * @param  {string} theUrl
 * @return {PatternMatchRequest} will be the object needed to parse later
 */
export default function tokenizeUrl(url, cpt = 2) {
  if (url) {
    return PatternMatching.makeRequest({
      url,
      type: cpt,
      sourceUrl: url,
    }, { getDomain, getHostname });
  }
  return null;
}


/**
 * This method will take a list of "tuples" containing
 *   {groupID: patternGroupID, patterns:[p1,.. ]}
 *
 * @return a new MultiPatternIndex object
 */
function buildMultiPatternIndex(multiPatternsList) {
  // Group categories by pattern id
  const id2filter = new Map();

  multiPatternsList.forEach((patternTuple) => {
    patternTuple.patterns.forEach((pattern) => {
      const filter = PatternMatching.parseNetworkFilter(pattern);
      if (filter) {
        // Keep track of original pattern
        filter.rawLine = pattern;

        if (!id2filter.has(filter.getId())) {
          id2filter.set(filter.getId(), {
            filter,
            categories: new Set([patternTuple.groupID]),
          });
        } else {
          id2filter.get(filter.getId()).categories.add(patternTuple.groupID);
        }
      } else {
        logger.error('Error parsing the filter / pattern ', pattern);
      }
    });
  });

  const parsedFilters = [];
  id2filter.forEach(({ filter, categories }) => {
    // eslint-disable-next-line no-param-reassign
    filter.groupID = [...categories];
    parsedFilters.push(filter);
  });

  return new MultiPatternIndex(parsedFilters);
}


function buildMultiPatternIndexPatternAsID(multiPatternsList) {
  const parsedFilters = [];
  multiPatternsList.forEach((pattern) => {
    const filter = PatternMatching.parseNetworkFilter(pattern);
    if (filter) {
      filter.rawLine = pattern;
      filter.groupID = pattern;
      parsedFilters.push(filter);
    } else {
      logger.error('Error parsing the filter / pattern ', pattern);
    }
  });
  return new MultiPatternIndex(parsedFilters);
}

/**
 * Will construct a simple PatternIndex given a list of patterns (patternList)
 */
function buildSimplePatternIndex(patternList) {
  const filterList = [];
  for (let i = 0; i < patternList.length; i += 1) {
    const pattern = patternList[i];
    const filter = PatternMatching.parseNetworkFilter(pattern);
    if (filter) {
      filter.rawLine = pattern;
      filterList.push(filter);
    }
  }
  return new SimplePatternIndex(filterList);
}


export {
  buildMultiPatternIndex,
  buildSimplePatternIndex,
  buildMultiPatternIndexPatternAsID
};
