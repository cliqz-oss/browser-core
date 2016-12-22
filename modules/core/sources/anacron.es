import { utils } from 'core/cliqz';

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;

export class Task {
  constructor(run, pattern) {
    this.run = run;
    this.pattern = this.parse(pattern);
  }

  // TODO: return false if currently running
  shouldRun(date = new Date()) {
    const pattern = this.pattern;
    const minutes = date.getMinutes();
    const hours = date.getHours();

    return (minutes % pattern.minutes.interval === 0 ||
            isNaN(pattern.minutes.interval) &&
              (isNaN(pattern.minutes.absolute) ||
               pattern.minutes.absolute === minutes)) &&
           (hours % pattern.hours.interval === 0 ||
            isNaN(pattern.hours.interval) &&
              (isNaN(pattern.hours.absolute) ||
               pattern.hours.absolute === hours));
  }

  parse(pattern) {
    const [minutes, hours] = pattern.split(' ').map((unit) => {
      const [absolute, interval] = unit.split('/').map(Number);
      return { absolute, interval };
    });
    return { hours, minutes };
  }
}

export class Queue {
  constructor() {
    this.consumers = [];
    this.queue = [];
  }

  isEmpty() {
    return !this.queue.length;
  }

  // TODO: add tests
  head() {
    return this.queue[0];
  }

  // TODO: add tests
  enqueue(item) {
    this.queue.push(item);
    if (!this.timeout) {
      this.timeout = utils.setTimeout(this.consume.bind(this), 0);
    }
  }

  // TODO: add tests
  subscribe(callback) {
    this.consumers.push(callback);
  }

  // TODO: add tests
  consume() {
    while (!this.isEmpty()) {
      const item = this.queue.shift();
      this.consumers.forEach(callback => callback(item));
      // TODO: make asynch, use setTimeout for next item
    }
    this.timeout = null;
  }
}

export class Cron {
  constructor() {
    this.isRunning = false;
    this.tasks = [];
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.clock = utils.setInterval(
      this.onTick.bind(this), ONE_MINUTE);
    this.isRunning = true;
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
    this.tasks.push(task);
    return task;
  }

  unschedule(task) {
    const index = this.tasks.indexOf(task);
    if (index >= 0) {
      this.tasks.splice(index, 1);
    }
  }

  run(date, { force } = { force: false }) {
    this.tasks
      .filter(task => force || task.shouldRun(date))
      .forEach(task => utils.setTimeout(task.run, 0, date));
  }

  onTick(date = new Date()) {
    this.run(date);
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
    this.queue = new Queue();
    // TODO: move to `start`; also call `unsubscribe` from `stop`
    this.queue.subscribe(this.run.bind(this));
  }

  // TODO: add tests
  run(date) {
    // `super.run` runs tasks asynchronously, thus does not block
    super.run(date);
    // TODO: test setting of setting
    this.last = date.getTime();
    // TODO: since `super.run` is asynchronous, not all tasks are completed at this point;
    //       timestamp setting should only be set once alls tasks are completed to avoid missing
    //       tasks (e.g., due to browser shutdown)
    this.storage.set(this.setting, String(this.last));
  }

  converge(date) {
    const now = date.getTime();
    if (!this.last || this.last > now) {
      this.last = now - ONE_MINUTE;
    }
    let next = this.last + ONE_MINUTE;
    while (now - next >= 0) {
      this.queue.enqueue(new Date(next));
      next += ONE_MINUTE;
    }
  }

  onTick(date = new Date()) {
    this.converge(date);
  }
}
