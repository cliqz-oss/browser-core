import utils from '../core/utils';

const defaultTPace = 10 * 1000;

class Pacemaker {

  constructor(tpace, twait) {
    this.tpace = tpace || defaultTPace;
    this.twait = (new Date()).getTime() + (twait || 0);
    this._id = null;
    this._tasks = new Set();
  }

  start() {
    if (this._id) {
      this.stop();
    }
    this._id = utils.setInterval(this._tick.bind(this), this.tpace, null);
  }

  stop() {
    utils.clearTimeout(this._id);
    this._id = null;
    this._tasks = new Set();
  }

  _tick() {
    const now = (new Date()).getTime();
    // initial waiting period
    if (this.twait > now) {
      utils.log('tick wait', 'pacemaker');
      return;
    }

    // run registered tasks
    this._tasks.forEach((task) => {
      if (now > task.last + task.freq) {
        utils.setTimeout(() => {
          const taskName = task.fn.name || '<anon>';
          try {
            // if task constraint is set, test it before running
            if (!task.when || task.when(task)) {
              utils.log(`run task: ${taskName}`, 'pacemaker');
              task.fn(now);
            }
            /* eslint-disable no-param-reassign */
            task.last = now;
            /* eslint-enable no-param-reassign */
          } catch (e) {
            utils.log(`Error executing task ${taskName}: ${e}`, 'pacemaker');
          }
        }, 0);
      }
    });
  }

  /** Register a function to be run periodically by the pacemaker.
        @param fn function to call
        @param frequency minimum interval between calls, in ms.
        @returns task object, which can be used with deregister to stop this task.
   */
  register(fn, frequency, constraint) {
    if (!fn) {
      throw new Error('fn cannot be undefined');
    }
    const task = {
      fn,
      freq: frequency || 0,
      last: 0,
      when: constraint
    };
    this._tasks.add(task);
    return task;
  }

  deregister(task) {
    this._tasks.delete(task);
  }
}

// export singleton pacemaker
const pm = new Pacemaker(30000, 30000);
export default pm;
