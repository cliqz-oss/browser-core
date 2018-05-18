import logger from '../common/offers_v2_logger';
import { parseNetworkFilter, mkRequest } from '../../core/pattern-matching';
import { MultiPatternIndex, SimplePatternIndex } from './pattern-utils-imp';
import { parse } from '../../core/tlds';


const normalize = str => decodeURI(str).toLowerCase();


/**
 * this method will generate the proper structure we need to use when matching
 * later against the patterns. This will build the "tokenizedURL object"
 * @param  {[type]} url [description]
 * @return {Object}     will be the object needed to parse later
 */
export default function tokenizeUrl(theUrl) {
  if (theUrl) {
    const url = normalize(theUrl);
    const { hostname, domain } = parse(url);
    return mkRequest({
      url,
      domain,
      hostname,
      cpt: 2,
      sourceHostname: hostname,
      sourceDomain: domain,
    });
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
  const parsedFilters = [];
  multiPatternsList.forEach((patternTuple) => {
    patternTuple.patterns.forEach((pattern) => {
      const filter = parseNetworkFilter(pattern);
      if (filter) {
        filter.groupID = patternTuple.groupID;
        parsedFilters.push(filter);
      } else {
        logger.error('Error parsing the filter / pattern ', pattern);
      }
    });
  });
  return new MultiPatternIndex(parsedFilters);
}

/**
 * Will construct a simple PatternIndex given a list of patterns (patternList)
 */
function buildSimplePatternIndex(patternList) {
  const filterList = (patternList.map(pattern => parseNetworkFilter(pattern)) || [])
    .filter(f => (!!f));
  return new SimplePatternIndex(filterList);
}


export {
  buildMultiPatternIndex,
  buildSimplePatternIndex
};
