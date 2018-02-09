import { parseNetworkFilter } from '../../core/pattern-matching';
import PatternIndex from './pattern-index';


/**
 * check if 2 arrays are equal
 */
const arrEq = (a1, a2) => {
  if (a1.length !== a2.length) {
    return false;
  }
  const len = a1.length;
  for (let i = 0; i < len; i += 1) {
    if (a1[i] !== a2[i]) {
      return false;
    }
  }
  return true;
};


/**
 * This method will build a map as follow pattern -> set(associated_patterns_ids)
 * @param  {[type]} patternsObj is an object of the type:
 * {
 *   pattern_id_1: [pidX1, pidX2, ..],
 *   pattern_id_2: [pidY1, pidY2, ..],
 * }
 * @return {Map} the map
 */
const buildPatternsMap = (patternsObj) => {
  const patternsMap = new Map();
  const pkeys = Object.keys(patternsObj);
  for (let i = 0; i < pkeys.length; i += 1) {
    const pkey = pkeys[i];
    const patterns = patternsObj[pkey];
    for (let j = 0; j < patterns.length; j += 1) {
      const pattern = patterns[j];
      if (!patternsMap.has(pattern)) {
        // create a set with this pattern in there
        patternsMap.set(pattern, new Set([pkey]));
      } else {
        // we have the pattern set, we add the pattern id to this one
        patternsMap.get(pattern).add(pkey);
      }
    }
  }
  return patternsMap;
};

/**
 * This method will create a filter list given the patterns Map and set
 * for each filter the list of associated pattern lists
 * @param  {[type]} patternsMap pattern -> set(pattern_ids)
 * @return {List}              with all the filters already formated
 */
const buildFilterList = (patternsMap) => {
  const filterList = [];
  patternsMap.forEach((pset, pattern) => {
    const filter = parseNetworkFilter(pattern, true, false);
    if (filter) {
      filter.id_set = pset;
      filterList.push(filter);
    }
    // TODO: will be nice to have a check or warning here if the filter cannot
    // be compiled.
  });
  return filterList;
};

/**
 * Will build a map of the form dayID -> [patternsIds]
 * @param  {[type]} daysQueriesObj day id -> patterns ids list
 * @return {[type]}                [description]
 */
const buildDaysPatternIdsMap = (daysQueriesObj) => {
  const daysPatternIdsMap = new Map();
  const daysKeys = Object.keys(daysQueriesObj);
  for (let i = 0; i < daysKeys.length; i += 1) {
    const dayKey = daysKeys[i];
    daysPatternIdsMap.set(dayKey, new Set(daysQueriesObj[dayKey]));
  }
  return daysPatternIdsMap;
};

/**
 * This method will count all the matches for all the patterns we have and will
 * return an object containing how many matches per day per pattern we have
 * @param  {[type]} data:
 *  {
 *     // the pattern id pointing to the patterns we should match for this one
 *     patterns_map: pattern id -> pattern list,
 *     // the days ids pointing to the list of patterns ids that we should
 *     // check for that given day
 *     days_queries_map: day id -> patterns ids list
 *     // the urls organized per day
 *     history_data_map: day id -> {requests: [url_history_req1, ...], last_ts: X }
 *   }
 * @param  {Map} daysPatternIdsMap    dayKey -> set(pids)
 * @param  {[type]} patternsIndex   structure used to match the patterns
 * @return {[type]} [description]
 * {
 *   pattern_id_1: {
 *     day_1: {
 *       m: N, // the number of matches for that given day and given pattern_id,
 *       c: M, // the number of urls we checked for that given day,
 *       last_ts: Z, // the last url timestamp in ms for the given day
 *     }
 *   }
 * }
 *
 */
const countMatches = (data, daysPatternIdsMap, patternsIndex) => {
  // prebuilt the result object of the shape:
  // pid -> (dayKey -> {counts, matches, last_ts}

  const result = {};
  const daysKeys = Object.keys(data.days_queries_map);
  const historyDays = Object.keys(data.history_data_map);

  // check the data is proper
  if (!arrEq(daysKeys, historyDays)) {
    throw new Error('Keys(days_queries_map) !== Keys(history_data_map)');
  }

  for (let i = 0; i < daysKeys.length; i += 1) {
    const dayKey = daysKeys[i];
    const pidsList = data.days_queries_map[dayKey];
    const requestsUrls = data.history_data_map[dayKey].requests;
    const lastTs = data.history_data_map[dayKey].last_ts;

    for (let j = 0; j < pidsList.length; j += 1) {
      const pid = pidsList[j];
      if (!result[pid]) {
        result[pid] = {};
      }
      if (!result[pid][dayKey]) {
        result[pid][dayKey] = { c: requestsUrls.length, m: 0, last_ts: lastTs };
      }
    }
  }

  for (let i = 0; i < historyDays.length; i += 1) {
    // the day id
    const dayKey = historyDays[i];
    // the patterns we should check for this given day
    if (daysPatternIdsMap.has(dayKey)) {
      const currentPatternsSet = daysPatternIdsMap.get(dayKey);
      // the urls that this day has
      const requestsUrls = data.history_data_map[dayKey].requests;
      // for each url on this day we check the patterns that match
      for (let j = 0; j < requestsUrls.length; j += 1) {
        const request = requestsUrls[j];
        const pidMatchedSet = patternsIndex.match(request, currentPatternsSet);
        // now we increment the matches counter since we already initialized before
        pidMatchedSet.forEach((pid) => {
          result[pid][dayKey].m += 1;
        });
      }
    }
  }
  return result;
};

export default function processData(data) {
  if (!data ||
      !data.patterns_map ||
      !data.days_queries_map ||
      !data.history_data_map) {
    throw new Error('Invalid data, some argument is missing');
  }
  // NEW ALGORITHM
  const patternsMap = buildPatternsMap(data.patterns_map);
  const filterList = buildFilterList(patternsMap);

  // we rebuild the pattern index here
  const patternsIndex = new PatternIndex(filterList);

  // we build now the day -> set of pattern ids here
  const daysPatternIdsMap = buildDaysPatternIdsMap(data.days_queries_map);

  // now count the matches and return
  return countMatches(data, daysPatternIdsMap, patternsIndex);
}

