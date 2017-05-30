import utils from '../utils';
import console from '../console';

/**
 * Executor which consumes asynchronous (Promise) tasks serially.
 * @namespace core/helpers
 * @class SerialExecutor
 */
export default class {
  constructor(autostart = true) {
    this._tasks = [];
    this._running = false;
    this._autostart = autostart;
  }

  /**
   * Add a task to the queue. The task will be executed as soon as all preceding tasks in the
   * queue have completed (i.e. `then` or `catch` on the Promise has been called).
   * @param {Function} task - function to run. Should return a {Promise}
   */
  enqueue(task) {
    if (typeof task !== 'function') {
      throw new Error('task must be a function');
    }
    this._tasks.push(task);

    if (!this._running && this._autostart) {
      utils.setTimeout(this.start.bind(this), 0);
    }
  }

  /**
   *  Start the executor. By default this is done automatically on task submission.
   */
  start() {
    if (this._running) {
      return;
    }
    this._running = true;
    this._consumeQueue().then(() => {
      this._running = false;
    });
  }

  /**
   * Execute all the tasks in the queue. This is called recursively to consume all queue elements
   * from beginning to end.
   */
  _consumeQueue() {
    if (this._tasks.length === 0) {
      return Promise.resolve();
    }
    // grab the first task and get the result. We expect this to be a Promise
    const task = this._tasks.shift();
    let result;
    try {
      result = task();
    } catch (e) {
      console.error('Exception running task', e);
      result = Promise.resolve();
    }
    // if result is not a Promise just put a warning in the console and then continue
    if (!result || typeof result.then !== 'function' || typeof result.catch !== 'function') {
      console.error(`Task ${task.name} didn't return a promise`);
      result = Promise.resolve();
    }
    // run _consumeQueue recursively to empty the queue
    const consumeNext = this._consumeQueue.bind(this);
    return result.catch((e) => {
      console.error('Error running async task', e);
    }).then(consumeNext);
  }
}
