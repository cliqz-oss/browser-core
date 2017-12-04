import background from '../core/base/background';
import logger from './logger';
import prefs from '../core/prefs';
import HistoryInterface from './history_interface';
import HistoryHandler from './history_handler';
import Database from '../core/database';
import history from '../core/history-service';
import Defer from '../core/app/defer';

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {
    this.persistFlag = prefs.get('historyAnalyzerPersistFlag', true);

    // the map holding the promises resolvers methods
    this.resultsCache = new Map();
    this._newDataCallbackBind = this._newDataCallback.bind(this);
    this.removeAllCachedDataBind = this.removeAllCachedData.bind(this);

    // subscribe to the history listener module if have one
    try {
      history.onVisitRemoved.addListener(this.removeAllCachedDataBind);
    } catch (e) {
      logger.error('Error setting the history remove listener: ', e);
    }

    this.historyInterface = new HistoryInterface();
    this.db = new Database('cliqz-history-analyzer');
    this.historyHandler = new HistoryHandler(this.historyInterface, this.db, this.persistFlag);
    this.historyHandler.addCallback(this._newDataCallbackBind);

    return this.historyHandler.loadPersistentData().then(() => {
      this.historyHandler.processTasks();
    });
  },

  unload() {
    // remove from the history module listener
    try {
      history.onVisitRemoved.removeListener(this.removeAllCachedDataBind);
    } catch (e) {
      logger.error('Error removing the history remove listener', e);
    }

    if (this.historyInterface) {
      this.historyInterface = null;
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (this.historyHandler) {
      this.historyHandler.removeCallback(this._newDataCallbackBind);
      this.historyHandler.destroy();
      this.historyHandler = null;
    }

    // resolve all promises if we have
    this.resultsCache.forEach((pr) => {
      // resolve the promise
      pr.reject(null);
    });
    this.resultsCache.clear();
  },

  beforeBrowserShutdown() {

  },

  _newDataCallback(data) {
    if (!data || !data.pid || !data.d) {
      logger.error('invalid callback data: ', data);
      return;
    }
    // unloading / loading this blows
    if (!this.resultsCache.has(data.pid)) {
      return;
    }
    this.resultsCache.get(data.pid).resolve(data);
    this.resultsCache.delete(data.pid);
  },

  events: {

  },

  actions: {
    hasCachedData(pid) {
      return this.historyHandler.hasEntryInCache(pid);
    },

    getCachedData(pid) {
      return this.historyHandler.getEntryData(pid);
    },

    performQuery(q) {
      const result = this.resultsCache.get(q.pid);
      if (result) {
        return result.promise;
      }

      // check if we can return the data right away
      const fullResult = this.historyHandler.getFullQueryResult(q);
      if (fullResult !== null) {
        const data = {
          pid: q.pid,
          d: fullResult,
        };
        return Promise.resolve(data);
      }

      // we need to process the result

      const defer = new Defer();
      this.resultsCache.set(q.pid, defer);
      this.historyHandler.addQuery(q);
      return defer.promise;
    },

    removeEntry(pid) {
      this.historyHandler.removeEntry(pid);
    },
  },

  // ///////////////////////////////////////////////////////////////////////////
  // Private
  // ///////////////////////////////////////////////////////////////////////////
  //

  /**
   * this method will be called when the user removes any entry on the history
   * so we also remove it on our cache
   * @return {[type]} [description]
   */
  removeAllCachedData() {
    this.historyHandler.removeCurrentData();
  },


});
