import processData from './history_proc';

/**
 * This class will bridge between worker messages to the history proc
 */
export default class HistoryProcMsgHandler {
  /**
   * @param  {[type]} respCallback this should be a function callback to be called
   *                               whenever we have a response to deliver to the
   *                               caller
   * @return {[type]}              [description]
   */
  constructor(respCallback) {
    this.respCb = respCallback;
  }

  setRespCallback(respCallback) {
    this.respCb = respCallback;
  }

  /**
   * layout of this will be:
   * {
   *   msg_type: 'process-task' | any other?
   *   d: {
   *     task_id: task.task_id,
   *     patterns_map: task.patterns_map,
   *     days_queries_map: task.days_queries_map,
   *     history_data_map: historyDataMap
   *   }
   * }
   * @param  {[type]} e [description]
   * @return {[type]}   [description]
   */
  onMessage(msg) {
    if (!msg) {
      // invalid message
      return;
    }

    const e = msg.data;
    if (!e || !e.d || !e.msg_type) {
      return;
    }

    // check the type
    if (e.msg_type !== 'process-task') {
      return;
    }

    if (!e.d.task_id || !e.d.patterns_map || !e.d.days_queries_map || !e.d.history_data_map) {
      return;
    }

    // process now
    try {
      // process
      const result = processData(e.d);
      this._processTaskFinished(e.d.task_id, result);
    } catch (err) {
      this._processTaskFailed(e.d.task_id, err);
    }
  }

  _processTaskFailed(taskID, errData) {
    const data = {
      msg_type: 'task-failed',
      d: {
        task_id: taskID,
        error: errData
      }
    };
    if (this.respCb) {
      this.respCb(data);
    }
  }

  _processTaskFinished(taskID, r) {
    const data = {
      msg_type: 'task-finished',
      d: {
        task_id: taskID,
        results: r
      }
    };
    if (this.respCb) {
      this.respCb(data);
    }
  }
}

