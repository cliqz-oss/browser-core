import CliqzUtils from 'core/utils';

const default_tpace = 10 * 1000;

class Pacemaker {

  constructor(tpace, twait) {
    this.tpace = tpace || default_tpace;
    this.twait = (new Date()).getTime() + (twait || 0);
    this._id = null;
    this._tasks = new Set();
  }

  start() {
    if (this._id) {
      this.stop();
    }
    this._id = CliqzUtils.setInterval(this._tick.bind(this), this.tpace, null);
  }

  stop() {
    CliqzUtils.clearTimeout(this._id);
    this._id = null;
    this._tasks = new Set();
  }

  _tick() {
    var now = (new Date()).getTime();
    // initial waiting period
    if (this.twait > now) {
      CliqzUtils.log("tick wait", "pacemaker");
      return;
    }

    // run registered tasks
    this._tasks.forEach(function(task) {
      if (now > task.last + task.freq) {
        CliqzUtils.setTimeout(function() {
          let task_name = task.fn.name || "<anon>";
          try {
            // if task constraint is set, test it before running
            if (!task.when || task.when(task)) {
              CliqzUtils.log("run task: "+ task_name, "pacemaker");
              task.fn(now);
            }
            task.last = now;
          } catch(e) {
            CliqzUtils.log("Error executing task "+ task_name +": "+ e, "pacemaker");
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
      throw "fn cannot be undefined";
    }
    var task = {
      fn: fn,
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
var pm = new Pacemaker(30000, 30000);
export default pm;
