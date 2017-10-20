import { getDateFromDateKey, getTodayDayKey, timestamp } from './time_utils';
import logger from './logger';

export default class HistoryInterface {

  constructor() {
    // TODO: this will work on all platforms?
    this.historyService = Components.classes['@mozilla.org/browser/nav-history-service;1']
        .getService(Components.interfaces.nsINavHistoryService);
  }

  /**
   * will perform queries for each day and will return a map from keydate => [urlentries..]
   * @param  {[type]} keyDaysList [description]
   * @return {Promise}            promise
   */
  getHistoryForKeyDays(keyDaysList) {
    if (!keyDaysList || keyDaysList.length === 0) {
      return null;
    }

    const queriesResult = [];
    const todayKey = getTodayDayKey();
    for (let i = 0; i < keyDaysList.length; i += 1) {
      const currKeyDate = Number(keyDaysList[i]);
      const startMicro = getDateFromDateKey(currKeyDate) * 1000;
      const endMicro = todayKey === currKeyDate ?
                       timestamp() * 1000 :
                       getDateFromDateKey(currKeyDate, 23, 59, 59) * 1000;
      // we need to perform a history query for this day and store the resulting
      // history entries on the map
      queriesResult.push(this._performHistoryQuery(startMicro, endMicro, currKeyDate));
    }

    const result = {};
    for (let i = 0; i < queriesResult.length; i += 1) {
      const pres = queriesResult[i];
      if (pres !== null) {
        result[pres.id] = { places: pres.places, last_ts: pres.last_ts };
      }
    }
    return result;
  }

  /**
   * start and end in microseconds
   * @param  {[type]} start microseconds
   * @param  {[type]} end   microseconds
   * @param  {[type]} id    [description]
   * @return {[type]}       [description]
   */
  _performHistoryQuery(start, end, id) {
    if (!this.historyService) {
      logger.error('No historyService present?');
      return null;
    }
    // queries parameters (e.g. domain name matching, text terms matching, time range...)
    // see : https://developer.mozilla.org/en/nsINavHistoryQuery
    const query = this.historyService.getNewQuery();
    if (!query) {
      logger.error('cannot get a new query from the history');
      return null;
    }
    query.beginTimeReference = query.TIME_RELATIVE_EPOCH;
    query.beginTime = start;
    query.endTimeReference = query.TIME_RELATIVE_EPOCH;
    query.endTime = end;

    // options parameters (e.g. ordering mode and sorting mode...)
    // see : https://developer.mozilla.org/en/nsINavHistoryQueryOptions
    const options = this.historyService.getNewQueryOptions();

    // TODO: here we should define better what options we want to support in the
    // future

    // execute the query
    // see : https://developer.mozilla.org/en/nsINavHistoryService#executeQuery()
    const result = this.historyService.executeQuery(query, options);
    if (!result) {
      logger.error('cannot execute the query');
    }

    // Using the results by traversing a container
    // see : https://developer.mozilla.org/en/nsINavHistoryContainerResultNode
    const cont = result.root;
    cont.containerOpen = true;
    const resultPages = [];
    for (let i = 0; i < cont.childCount; i += 1) {
      const node = cont.getChild(i);

      // "node" attributes contains the information (e.g. uri, title, time, icon...)
      // see : https://developer.mozilla.org/en/nsINavHistoryResultNode
      resultPages.push(node.uri);
    }
    // Close container when done
    // see : https://developer.mozilla.org/en/nsINavHistoryContainerResultNode
    cont.containerOpen = false;
    return { id, places: resultPages, last_ts: (end / 1000) };
  }
}
