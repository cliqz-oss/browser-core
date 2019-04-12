/**
 * @module offers-v2
 * @class PatternUtils
 * @static
 */
import { parse } from '../../core/tlds';
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
    }, parse);
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
  const filters = [];
  const id2categories = new Map();
  const id2pattern = new Map();

  multiPatternsList.forEach(({ patterns, groupID }) => {
    patterns.forEach((pattern) => {
      const filter = PatternMatching.NetworkFilter.parse(pattern);
      if (filter) {
        // Keep track of original pattern for each filter
        id2pattern.set(filter.getId(), pattern);
        filters.push(filter);

        // Attach a list of categories for each pattern
        const categories = id2categories.get(filter.getId()) || new Set();
        categories.add(groupID);
        id2categories.set(filter.getId(), categories);
      } else {
        logger.error('Error parsing the filter / pattern ', pattern);
      }
    });
  });

  return new MultiPatternIndex(filters, id2pattern, id2categories);
}


function buildMultiPatternIndexPatternAsID(multiPatternsList) {
  const parsedFilters = [];
  const id2pattern = new Map();
  const id2categories = new Map();
  multiPatternsList.forEach((pattern) => {
    const filter = PatternMatching.NetworkFilter.parse(pattern);
    if (filter) {
      parsedFilters.push(filter);
      id2pattern.set(filter.getId(), pattern);
      id2categories.set(filter.getId(), new Set([pattern]));
    } else {
      logger.error('Error parsing the filter / pattern ', pattern);
    }
  });
  return new MultiPatternIndex(parsedFilters, id2pattern, id2categories);
}

/**
 * Will construct a simple PatternIndex given a list of patterns (patternList)
 */
function buildSimplePatternIndex(patternList) {
  const filterList = [];
  const id2pattern = new Map();
  for (let i = 0; i < patternList.length; i += 1) {
    const pattern = patternList[i];
    const filter = PatternMatching.NetworkFilter.parse(pattern);
    if (filter) {
      id2pattern.set(filter.getId(), pattern);
      filterList.push(filter);
    }
  }
  return new SimplePatternIndex(filterList, id2pattern);
}


export {
  buildMultiPatternIndex,
  buildSimplePatternIndex,
  buildMultiPatternIndexPatternAsID
};
