import logger from './logger';
import { timestamp } from '../core/time';

// Status states of the executor
const STATUS = {
  IDLE: 'idle',
  EXECUTING: 'executing',
  FINISHED: 'finished'
};
// how much time we want to wait till assume a task is dead or failed
const MAX_TASK_TIME_MS = 10 * 1000;


/**
 * This class will be in charge of executing a given task and track the progress
 * of it with the worker
 */
export default class TaskExecutor {
  /**
   * The expected task layout:
   * {
   *   task_id: xyz,
   *   patterns_map: {},
   *   days_queries_map: {},
   *   history_data_map:{}
   * }
   */
  constructor(worker, onTaskFinishedCb) {
    this.task = null;
    this.worker = worker;
    this.status = STATUS.IDLE;
    this.failed = false;
    this.result = null;
    this.executedTS = null;
    this.onTaskFinishedCb = onTaskFinishedCb;

    // configure the worker
    this._processWorkerMessage = this._processWorkerMessage.bind(this);
    this.worker.setOnmessageCb(this._processWorkerMessage);
  }

  configureNewTask(task) {
    // clear all state
    this.status = STATUS.IDLE;
    this.failed = false;
    this.result = null;
    this.executedTS = null;

    // setup the new task
    this.task = task;
  }

  /**
   * Call this method to update the current status of the task
   */
  updateStatus() {
    this._calculateStatus();
  }

  isConfigured() {
    return this.task !== null;
  }
  hasStarted() {
    return this.status === STATUS.EXECUTING;
  }
  hasFinished() {
    return this.status === STATUS.FINISHED;
  }
  hasFailed() {
    return this.hasFinished() && this.failed;
  }
  hasSucceed() {
    return !this.hasFailed();
  }
  getResult() {
    return this.result;
  }
  getTask() {
    return this.task;
  }

  /**
   * executes the current task and return true on success | false otherwise
   */
  execute() {
    this.updateStatus();
    if (this.hasStarted() || this.hasFinished()) {
      // still waiting
      logger.error(`We are trying to execute the task [${this.task.task_id}] again?`);
      return false;
    }

    // execute it
    this.worker.postMessage({ msg_type: 'process-task', d: this.getTask() });
    this.executedTS = timestamp();
    this.status = STATUS.EXECUTING;

    return true;
  }


  /**
   * this method will check if the task we are currently executing failed or not
   * @return {[type]} [description]
   */
  _calculateStatus() {
    // check if already finished then there is nothing to do
    if (this.status === STATUS.FINISHED) {
      return;
    }

    // check if we already executed the task
    if (this.executedTS === null) {
      this.status = STATUS.IDLE;
      return;
    }

    // check if expired
    const now = timestamp();
    // check if the task is a new one
    if (((now - this.executedTS) < MAX_TASK_TIME_MS)) {
      // still executing
      this.status = STATUS.EXECUTING;
      return;
    }

    // else is failed because of timeout
    this.status = STATUS.FINISHED;
    this.failed = true;
    if (this.onTaskFinishedCb) {
      this.onTaskFinishedCb();
    }
    logger.error(`The task with id ${this.task.task_id} timedout?`);
  }


  _processWorkerMessage(m) {
    if (this.hasFinished()) {
      logger.error(`The task ${this.task.task_id} already finished...`);
      return;
    }

    // m.data contains the packet
    if (!m || !m.data || !m.data.msg_type || !m.data.d || !m.data.d.task_id) {
      // we either skip the message or we assume is the current task that failed..
      // for now we will skip the message since if the worker doesnt reply anymore
      // we will assume the task failed after MAX_TASK_TIME_MS
      logger.error('Invalid message received from the worker?', m);
      return;
    }

    const d = m.data.d;
    // check if the message is associated to this task
    if (d.task_id !== this.task.task_id) {
      logger.error(`Worker wrong task id reply: ${d.task_id}, expected: ${this.task.task_id}`);
      return;
    }

    // the task finished either success or failed
    this.status = STATUS.FINISHED;

    // we now process the msg from the worker:
    // - task-failed
    // - task-finished
    if (m.data.msg_type === 'task-failed') {
      logger.error(`Task ${d.task_id} failed, error: ${d.error}`, d);
      this.failed = true;
      this.result = d.error;
    } else if (m.data.msg_type === 'task-finished') {
      // task finished successfully
      logger.log('task finished properly');
      this.failed = false;
      this.result = d.results;
    } else {
      logger.error(`invalid message type got from the worker ${m.data.msg_type}`, d);
      this.failed = true;
      this.result = null;
    }

    // notify the creator that the task finished
    if (this.onTaskFinishedCb) {
      this.onTaskFinishedCb();
    }
  }

}

