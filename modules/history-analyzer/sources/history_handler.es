import logger from './logger';
import utils from '../core/utils';
import HistoryEntry from './history_entry';
import HistoryWorker from './history_worker';
import SimpleDB from '../core/persistence/simple-db';
import { processRawRequest } from '../core/adblocker-base/filters-engine';
import { PersistentDataHandler, BasicDataHolder } from './persistent-helpers';
import TaskHandler from './task-handler';
import TaskExecutor from './task-executor';
import { timestamp } from './time_utils';

// how frequently we will check for the current status of the task and proceed
// with the next ones if we have some for any reason
const PROCESS_INTERVAL_TIME_MS = 15 * 1000; // 15 seconds?
// for how much time we want to store the data after the last time we saw an
// access to it (someone use it basically)
const MAX_DATA_TIME_PERSIST_MS = 15 * 24 * 60 * 60 * 1000;

// cache globals
const CACHE_DOC_ID = 'ha-hientries_cache';

/**
 * We will hold the cache entries here and save whenever is needed
 */
class CacheHandler {
  constructor(db) {
    this.dh = (db) ?
      new PersistentDataHandler(CACHE_DOC_ID, {}, db) :
      new BasicDataHolder(CACHE_DOC_ID, {}, db);
    this.c = new Map();
  }

  has(id) { return this.c.has(id); }
  get(id) { return this.c.get(id); }
  set(id, v) {
    this.c.set(id, v);
    this.dh.markDataDirty();
  }
  delete(id) {
    if (this.c.has(id)) {
      this.c.delete(id);
      this.dh.markDataDirty();
    }
  }
  get cache() { return this.c; }

  save() {
    // serialize and save
    const entriesCache = {};
    this.c.forEach((value, key) => {
      entriesCache[key] = value.getData();
    });
    this.dh.data = entriesCache;
    return this.dh.save(true).then(() => {
      // clear the data on the cache
      this.dh.data = {};
    });
  }

  load() {
    return this.dh.load().then(() => {
      this.c = new Map();
      const entriesKeys = Object.keys(this.dh.data);
      const now = timestamp();
      for (let i = 0; i < entriesKeys.length; i += 1) {
        const k = entriesKeys[i];
        const historyEntry = new HistoryEntry(this.dh.data[k]);
        // check if the history entry is too old
        const lastAccessedTs = historyEntry.getLastAccessedTimestamp();
        if ((now - lastAccessedTs) <= MAX_DATA_TIME_PERSIST_MS) {
          this.c.set(k, historyEntry);
        } else {
          logger.log(`discarding old entry ${k}`);
          this.dh.markDataDirty();
        }
      }
      // clear
      this.dh.data = {};
    });
  }

  clear() {
    this.c = new Map();
    this.dh.markDataDirty();
    this.dh.data = {};
  }

  erase() {
    this.clear();
    return this.dh.erase();
  }
}


/**
 * This class will will handle all the flow and functionality of the module:
 * - Gather queries (queries to be performed on history entries => pattern matching).
 * - Build tasks to be performed on the worker (TaskHandler), also keep the state
 *   in a persistent way.
 * - Execute the tasks on the worker and follow progress (TaskExecutor).
 * - Update the data on the cache and notify callbacks.
 */
export default class HistoryHandler {

  /**
   *
   * @param  {[type]} historyInterface is a wrapper to the real history providing
   *                                   some helper and easy interface to access
   *                                   and sort the results
   * @param  {[type]} db               the database wrapper to use for storing the
   *                                   data
   * @param {Boolean} shouldPersist    flag indicating if we should store the
   *                                   data in DB or not
   * @return {[type]}                  [description]
   */
  constructor(historyInterface, db, shouldPersist = true) {
    if (shouldPersist) {
      this.db = new SimpleDB(db);
    } else {
      this.db = null;
    }

    this.historyInterface = historyInterface;
    this._taskFinishedCb = this._taskFinishedCb.bind(this);
    // create the worker and init
    this.worker = new HistoryWorker();

    this.entriesCache = new CacheHandler(this.db);
    this.taskHandler = new TaskHandler(this.db, this.entriesCache);
    this.taskExecutor = new TaskExecutor(this.worker, this._taskFinishedCb);

    // callbacks to be called whenever there is a new data
    this.callbacksMap = new Map();

    // process interval
    this.checkInterval = utils.setInterval(() => {
      this.processTasks();
    }, PROCESS_INTERVAL_TIME_MS);
  }

  destroy() {
    utils.clearInterval(this.checkInterval);
    this.checkInterval = null;

    this.callbacksMap.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.entriesCache.save();
  }

  loadPersistentData() {
    return Promise.all([this.entriesCache.load(), this.taskHandler.load()]);
  }

  savePersistentData() {
    return Promise.all([this.entriesCache.save(), this.taskHandler.save()]);
  }

  // check if we have a history index for a given id (pattern id)
  hasEntryInCache(pid) {
    return this.entriesCache.has(pid);
  }

  // return the history entry associated to the pattern id if we have one
  // already cached
  getEntryData(pid) {
    return this.entriesCache.get(pid);
  }

  // subscribe a callback to get events
  addCallback(cb) {
    this.callbacksMap.set(cb, cb);
  }

  // remove the callback
  removeCallback(cb) {
    this.callbacksMap.delete(cb);
  }

  /**
   * add a new query to be executed on the history analyzer module
   * @param {[type]} q query data:
   * {
   *   // the object containing the patterns we want to use for this
   *   patterns: {},
   *   // the patterns unique id (category id)
   *   pid: 'xyz',
   *   // start timestmap to measure (ms)
   *   start_ms: x,
   *   // end timestamp to measure (ms)
   *   end_ms: y
   * }
   */
  addQuery(q) {
    return this.taskHandler.addQuery(q);
  }

  /**
   * will return the result for the given query if we have all the data, otherwise
   * we will return null (we need to process the query)
   */
  getFullQueryResult(q) {
    return this.taskHandler.getFullQueryResult(q);
  }

  // start processing tasks
  processTasks() {
    // update tasks if any
    this.taskHandler.build();

    // check if we have tasks to process
    if (!this.taskHandler.hasTasks()) {
      // nothing to do now
      return true;
    }

    // check if we finished the task already
    if (!this.taskExecutor.isConfigured() || this.taskExecutor.hasFinished()) {
      // we need to create one
      const taskData = this._getNextValidTask();
      if (taskData === null) {
        // nothing to do here...
        return false;
      }
      this.taskExecutor.configureNewTask(taskData);

      // execute the task here
      this.taskExecutor.execute();
    }

    // update the status of the executor to check if the task expired or finished
    this.taskExecutor.updateStatus();
    return true;
  }

  /**
   * will remove the data we have associated to a given pid
   */
  removeEntry(pid) {
    if (!this.hasEntryInCache(pid)) {
      return;
    }
    this.entriesCache.delete(pid);
    this.entriesCache.save();
  }

  /**
   * remove the current data from the databases as well
   * @return {[type]} [description]
   */
  removeCurrentData() {
    // remove the cache
    this.entriesCache.clear();
    this.entriesCache.erase();
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                            Private methods
  // ///////////////////////////////////////////////////////////////////////////
  //

  _taskFinishedCb() {
    if (!this.taskExecutor.hasFinished()) {
      logger.error('The task executor actually didnt finished?');
      return;
    }

    // now we process the result of the task depending if succeed or fail
    if (this.taskExecutor.hasFailed()) {
      // nothing to do for now, just log
      logger.error('current task failed, skipping it', this.taskExecutor.getTask());
    } else if (this.taskExecutor.hasSucceed()) {
      this._processTaskFinished(this.taskExecutor.getResult());
    } else {
      logger.error('Inconsistent state?');
    }

    // we remove the current task since it is done and proceed
    this.taskHandler.popTask();
    this.taskExecutor.configureNewTask(null);
    this.processTasks();
  }

  _getNextValidTask() {
    let taskData = null;
    while (taskData === null && this.taskHandler.hasTasks()) {
      const currentTask = this.taskHandler.currentTask();
      taskData = this._prepareTask(currentTask);
      if (taskData === null) {
        logger.error('Skipping the task since cannot be built?', currentTask);
        this.taskHandler.popTask();
      }
    }
    return taskData;
  }

  /**
   * will notify all the callbacks that we have new data for a particular pid
   * @param  {[type]} pid [description]
   * @param  {string} msgType [description]
   * @param  {object} data [description]
   * @return {[type]}     [description]
   */
  _notifyCallbacks(pid, msgType, data) {
    this.callbacksMap.forEach((cb) => {
      if (cb) {
        // get the data for the given pid
        const cbData = {
          msg_type: msgType,
          pid,
          d: data,
        };
        cb(cbData);
      }
    });
  }

  /**
   * Will prepare the task to be delivery to the executor. Will fetch the history
   * data and prepare it in the correct format
   */
  _prepareTask(task) {
    if (!task || !task.patterns_map || !task.days_queries_map || !task.task_id) {
      logger.error('Cannot prepare a task: ', task);
      return null;
    }

    // we here need to build the package to be sent to the worker which will be
    // an object containing the following data:
    // {
    //  task_id: XYZ, identifying the current task.
    //  patterns_map: the patterns map (id -> pattern_object)
    //  days_queries_map: {date_key_1: [pid_1, pid_2,...], ...},
    //  history_data_map: {date_key_1: { requests: [req_url_1, req_url_2,...], last_ts: x },
    // }
    //
    const daysToQuery = Object.keys(task.days_queries_map);
    const historyDataMap = this.historyInterface.getHistoryForKeyDays(daysToQuery);
    if (!historyDataMap) {
      logger.error('cannot fetch urls days from history');
      return null;
    }

    // we now here will convert the url into requests since this is the way that
    // the worker will process the entries
    const resultDays = Object.keys(historyDataMap);
    const requestHistoryMap = {};
    for (let i = 0; i < resultDays.length; i += 1) {
      const cday = resultDays[i];
      const urls = historyDataMap[cday].places;
      requestHistoryMap[cday] = { last_ts: historyDataMap[cday].last_ts, requests: [] };
      const rresult = requestHistoryMap[cday].requests;
      for (let j = 0; j < urls.length; j += 1) {
        const request = processRawRequest({ url: urls[j], sourceUrl: '', cpt: 2 });
        rresult.push(request);
      }
    }
    return {
      task_id: task.task_id,
      patterns_map: task.patterns_map,
      days_queries_map: task.days_queries_map,
      history_data_map: requestHistoryMap
    };
  }

  _processTaskFinished(taskResult) {
    logger.log('processing the results of the task finished');

    if (!taskResult) {
      logger.error('Invalid arguments: taskResult === null?');
      return false;
    }

    // add the results to the cache and save the results on the DB
    const pidList = Object.keys(taskResult);
    for (let i = 0; i < pidList.length; i += 1) {
      const pid = pidList[i];
      let cacheEntry = this.entriesCache.get(pid);
      if (!cacheEntry) {
        cacheEntry = new HistoryEntry();
        this.entriesCache.set(pid, cacheEntry);
      }
      const dayMap = taskResult[pid];
      const dayKeyList = Object.keys(dayMap);
      for (let j = 0; j < dayKeyList.length; j += 1) {
        const dayKey = dayKeyList[j];
        const dayData = dayMap[dayKey];
        cacheEntry.setDayData(dayKey, dayData);
      }
      try {
        this._notifyCallbacks(pid, 'new-data', cacheEntry.getDataForDays(dayKeyList));
      } catch (err) {
        logger.error('Error notifying the callbacks, some failed', err);
      }
    }

    // save the cache
    this.entriesCache.save();

    return true;
  }


}
