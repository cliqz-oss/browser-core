import { utils } from './cliqz';
import moment from '../platform/moment';
import cronParser from './lib/cron-parser';


export class Task {
  constructor(run, pattern) {
    this.run = run;
    this.pattern = pattern;
    this.defaultIterator = this.iterator();
  }

  iterator(from = new Date()) {
    return cronParser.parseExpression(this.pattern, { currentDate: from, utc: true });
  }

}


class OrderedMultiIterator {
  constructor(comparator) {
    this.iterators = {};
    this.queue = [];
    this.comparator = comparator;
  }

  addIterator(index, it) {
    this.iterators[index] = it;
    this.queue.push({ index, value: it.next() });
  }

  removeIterator(index) {
    delete this.iterators[index];
    this.queue = this.queue.filter(el => el.index !== index);
  }

  peek() {
    if (this.queue.length === 0) {
      return null;
    }
    this.queue.sort(this.comparator);
    return this.queue[0];
  }

  next() {
    if (this.queue.length === 0) {
      return null;
    }
    this.queue.sort(this.comparator);
    const first = this.queue.splice(0, 1)[0];
    // get another element from the consumed iterator
    this.queue.push({
      index: first.index,
      value: this.iterators[first.index].next()
    });
    return first;
  }
}

export class Cron {
  constructor() {
    this.isRunning = false;
    this._i = 0;
    this.tasks = {};
    this.taskQueue = new OrderedMultiIterator((a, b) => a.value.toDate() - b.value.toDate());
    this.RATE_LIMIT = 10000;
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.clock = null;
    this.isRunning = true;
    this._scheduleNext();
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    utils.clearInterval(this.clock);
    this.isRunning = false;
  }

  schedule(func, pattern) {
    const task = new Task(func, pattern);
    this._i += 1;
    this.tasks[this._i] = task;
    this.taskQueue.addIterator(this._i, this.getIteratorForTask(task));
    if (this.isRunning) {
      this._scheduleNext();
    }
    return this._i;
  }

  getIteratorForTask(task) {
    return task.defaultIterator;
  }

  unschedule(task) {
    delete this.tasks[task];
    this.taskQueue.removeIterator(task);
    this._scheduleNext();
  }

  _scheduleNext() {
    utils.clearTimeout(this.clock);
    const nextTask = this.taskQueue.peek();
    if (nextTask) {
      const inMillis = nextTask.value.getTime() - Date.now();
      console.log('cron', `schedule task in ${moment.duration(inMillis, 'ms').toString()}, ${nextTask.value.toString()}`);
      this.clock = utils.setTimeout(this._runNext.bind(this),
        Math.max(this.RATE_LIMIT, inMillis));
    }
  }

  _runNext() {
    const task = this.taskQueue.next();
    this.runTask(task.index, new Date(task.value.getTime()));
    this.nextTask = null;
    this.clock = null;
    this._scheduleNext();
  }

  run(date, { force } = { force: false }) {
    if (force) {
      Object.keys(this.tasks)
      .forEach((id) => utils.setTimeout(this.runTask.bind(this, id, date)));
    } else {
      this._scheduleNext();
    }
  }

  runTask(id, date) {
    this.tasks[id].run(date);
  }

}

// Anacron
export default class extends Cron {
  constructor(storage, { name = 'core.anacron' } = { }) {
    super();
    this.storage = storage;
    // TODO: test getting of setting
    this.setting = `${name}.last`;
    this.last = Number(this.storage.get(this.setting, 0));
  }

  getIteratorForTask(task) {
    // iterator starting from last saved point
    return task.iterator(new Date(this.last || Date.now()));
  }

  runTask(id, date) {
    super.runTask(id, date);
    // persist task run time to storage
    this.last = date.getTime();
    this.storage.set(this.setting, String(this.last));
  }

}
