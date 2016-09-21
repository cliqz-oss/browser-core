/*
Blatant rip-off from
https://github.com/cliqz/navigation-extension/blob/master/modules/antitracking/sources/pacemaker.es
*/

const default_tpace = 250;

var Pacemaker = class Pacemaker {

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
    this._id = setInterval(this._tick.bind(this), this.tpace, null);
  }

  stop() {
    clearTimeout(this._id);
    this._id = null;
    this._tasks = new Set();
  }

  _tick() {
    var now = (new Date()).getTime();
    // initial waiting period
    if (this.twait > now) {
      console.log("tick wait", "pacemaker");
      return;
    }

    // run registered tasks
    this._tasks.forEach(function(task) {
      if (now > task.last + task.freq) {
        setTimeout(function() {
          let task_name = task.fn.name || "<anon>";
          try {
            // if task constraint is set, test it before running
            if (!task.when || task.when(task)) {
              task.fn(now);
            }
            task.last = now;
          } catch(e) {
            console.log("Error executing task "+ task_name +": "+ e, "pacemaker");
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