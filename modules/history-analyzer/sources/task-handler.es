import logger from './logger';
import { getDaysFromTimeRange, getTodayDayKey } from '../core/time';
import { PersistentDataHandler, BasicDataHolder } from './persistent-helpers';
import Interval from './interval';
import random from '../core/crypto/random';

// /////////////////////////////////////////////////////////////////////////////

const MAX_DAYS_BUCKET = 200;
const STATE_DOC_ID = 'ha-history-handler-state';
const defaultState = {
  queries: [],
  taskQueue: [],
  currentTaskID: '',
};

// /////////////////////////////////////////////////////////////////////////////

// TODO: move this to core?
const getUniqueID = () => {
  function s4() {
    return Math.floor((1 + random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

/**
 * Build a map of pattern id -> list of intervals
 */
const buildIntervalsMapFromQueriesList = (queriesList) => {
  const intervalsMap = new Map();
  for (let i = 0; i < queriesList.length; i += 1) {
    const q = queriesList[i];
    const interval = new Interval(q.start_ms, q.end_ms);
    if (!intervalsMap.has(q.pid)) {
      intervalsMap.set(q.pid, [interval]);
    } else {
      intervalsMap.get(q.pid).push(interval);
    }
  }
  return intervalsMap;
};

/**
 * for each patterns ids -> list of intervals we will first normalize them
 * to non-overlapping intervals and for each of the non overlapping interval
 * we will get the days on that time range to get the days we need to calculate
 * filtering out the days we already have on the entries cache (+ today)
 *
 * @return {object} of the shape id_key -> list(pids), meaning in which days we
 * have to match witch patterns.
 */
const buildDayQueriesMap = (intervalsMap, entriesCache) => {
  // helper entries cache map function
  const haveCachedData = (pid, dayKey) =>
    entriesCache.has(pid) && entriesCache.get(pid).hasProcessedDay(dayKey);

  const todayKeyDay = getTodayDayKey();
  const daysQueriesMap = {};
  intervalsMap.forEach((intervalList, pid) => {
    const nonOverlapings = Interval.generateNonOverlapsIntervals(intervalList);
    // (4)
    for (let i = 0; i < nonOverlapings.length; i += 1) {
      const interval = nonOverlapings[i];
      const days = getDaysFromTimeRange(interval.start, interval.end);
      // (5), (6)
      for (let j = 0; j < days.length; j += 1) {
        const currDayKey = days[j];
        // check if we have that entry already or not, or if it is today (we will
        // re calculate in that case).
        if (!haveCachedData(pid, currDayKey) || currDayKey === todayKeyDay) {
          let pidList = daysQueriesMap[currDayKey];
          if (!pidList) {
            pidList = daysQueriesMap[currDayKey] = [];
          }
          pidList.push(pid);
        }
      }
    }
  });
  return daysQueriesMap;
};

/**
 * This method will split the current days we are trying to query (DB) and split
 * it in buckets of tasks (list of tasks).
 * The output of this method is a list of tasks of non-overlaping days to be
 * queried to the DB
 */
const splitAndCreateTasks = (daysQueriesMap, patternsMap) => {
  // split here for every N days to avoid bottlenecks, we can do more
  // intelligent splitting in the future
  const dayKeys = Object.keys(daysQueriesMap);
  const numDays = dayKeys.length;
  const result = [];
  if (numDays === 0) {
    // no days provided??
    return result;
  }
  if (numDays > MAX_DAYS_BUCKET) {
    const resultDaysBuckets = [];
    while (dayKeys.length > 0) {
      resultDaysBuckets.push(dayKeys.splice(0, MAX_DAYS_BUCKET));
    }
    logger.log(`Splitting tasks into ${resultDaysBuckets.length} for ${numDays} days`);
    for (let i = 0; i < resultDaysBuckets.length; i += 1) {
      const daysBucket = resultDaysBuckets[i];
      const daysQueryBucketMap = {};
      const patternIdsSet = new Set();
      for (let j = 0; j < daysBucket.length; j += 1) {
        const dayKey = daysBucket[j];
        daysQueryBucketMap[dayKey] = daysQueriesMap[dayKey];
        for (let k = 0; k < daysQueriesMap[dayKey].length; k += 1) {
          patternIdsSet.add(daysQueriesMap[dayKey][k]);
        }
      }
      // get the patterns for this bucket
      const patternsBucketMap = {};
      patternIdsSet.forEach((pid) => {
        patternsBucketMap[pid] = patternsMap[pid];
      });

      result.push({
        patterns_map: patternsBucketMap,
        days_queries_map: daysQueryBucketMap,
        task_id: getUniqueID()
      });
    }
  } else {
    // now we can store the task
    result.push({
      patterns_map: patternsMap,
      days_queries_map: daysQueriesMap,
      task_id: getUniqueID()
    });
  }
  return result;
};

/**
 * This class will wrap the tasks we need to process and also will be in charge
 * of building them if new queries arrives.
 */
export default class TaskHandler {

  constructor(db, entriesCache) {
    this.entriesCache = entriesCache;
    this.dh = (db) ?
          new PersistentDataHandler(STATE_DOC_ID, defaultState, db) :
          new BasicDataHolder(STATE_DOC_ID, defaultState, db);
    this.d = this.dh.data;
  }

  load() {
    return this.dh.load();
  }
  save() {
    return this.dh.save();
  }

  addQuery(q) {
    if (!this._checkQuery(q)) {
      logger.error('Invalid query: ', q);
      throw new Error('Invalid query!');
    }
    this.d.queries.push(q);
    this.dh.save(true);
    return true;
  }

  /**
   * will return the result for the given query if we have all the data, otherwise
   * we will return null (we need to process the query)
   */
  getFullQueryResult(q) {
    if (!this._checkQuery(q)) {
      logger.error('Invalid query', q);
      throw new Error('Invalid query');
    }
    if (!this.entriesCache.has(q.pid)) {
      return null;
    }
    const cacheEntry = this.entriesCache.get(q.pid);
    const daysToBeQueried = getDaysFromTimeRange(q.start_ms, q.end_ms);
    const todayKeyDay = getTodayDayKey();

    // check if we have all days and any of them is today (we will recalculate this)
    for (let i = 0; i < daysToBeQueried.length; i += 1) {
      const dayKey = daysToBeQueried[i];
      if (todayKeyDay === dayKey || !cacheEntry.hasProcessedDay(dayKey)) {
        return null;
      }
    }

    // we can return right away
    return cacheEntry.getDataForDays(daysToBeQueried);
  }


  hasTasks() {
    return this.d.taskQueue.length > 0;
  }

  tasksCount() {
    return this.d.taskQueue.length;
  }

  currentTask() {
    return this.d.taskQueue[0];
  }

  popTask() {
    this.d.taskQueue.splice(0, 1);
    this.dh.save(true);
  }

  /**
   * this method will build the tasks if any from the given queries
   */
  build() {
    this._buildTasksFromQueries();
  }

  _checkQuery(q) {
    return (q &&
            q.start_ms !== undefined &&
            q.end_ms !== undefined &&
            q.start_ms <= q.end_ms &&
            q.pid &&
            q.patterns &&
            q.patterns.length > 0);
  }

    // build a list of tasks given the current list of queries we want to perform
  // and enqueue them on the list
  _buildTasksFromQueries() {
    // A task will be an object with the following information
    // {
    //    patterns_map: {pid_1: pattern_object, ...},
    //    days_queries_map: {date_key_1: [pid_1, pid_2,...], ...},
    //    task_id: xyz, // the unique id for this task
    // }

    // algorithm
    // 1 - we group queries per id
    // 2 - once we have all queries of the same id we get the intervals
    // 3 - we later get all the non-overlaping intervals for the given intervals
    // 4 - for each interval we get the days
    // 5 - for each day we have and pid we will process it if and only if
    //     there is no cache entry for that day and pid
    // 6 - for each day we add the id to the days_queries_map

    if (this.d.queries.length === 0) {
      // nothing to do
      return;
    }

    // (1), (2)
    const intervalsMap = buildIntervalsMapFromQueriesList(this.d.queries);

    // (3), (4), (5), (6)
    const daysQueriesMap = buildDayQueriesMap(intervalsMap, this.entriesCache);

    // get the patterns here
    const patternsMap = {};
    for (let i = 0; i < this.d.queries.length; i += 1) {
      const q = this.d.queries[i];
      if (!patternsMap[q.pid]) {
        patternsMap[q.pid] = q.patterns;
      }
    }

    // get the tasks from the given queries
    const tasks = splitAndCreateTasks(daysQueriesMap, patternsMap);

    // now we need to add the current tasks into the queue and remove the queries
    this.d.queries = [];
    tasks.forEach(t => this.d.taskQueue.push(t));
    this.dh.save(true);
  }

}

