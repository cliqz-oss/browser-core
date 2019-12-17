/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../kord/inject';
import Logger from '../logger';
import { setTimeout } from '../timers';

// Pacemaker is a service which allows to schedule tasks (either as intervals or
// timeouts) while doing its best to not wake-up the browser too often. To this
// end, it offers a few common intervals (e.g.: every minute, every hour,
// etc.) and makes sure that all the tasks are triggered at the same time. It
// also tries to adapt its own frequency depending on registered tasks to
// trigger as rarely as possible while respecting the contract. As a
// consequence, if there is no task registered, the pacemaker will do nothing.
//
// It is possible to schedule tasks at any time, but this is not recommended. To
// make sure the efficiency is maximal, you should pick a pre-defined method
// like `everyFewMinutes` (instead of `register`) and choose the maximum time
// which fits your use-case.
//
// Here are a few examples:
//
// 1. You need to update a config fetched from CDN and it does not change more
// than once an hour, then it's recommended to use `pacemaker.everyHour()`.
//
// 2. You need to run a check on the state of your module every few seconds (and
// it does not matter exactly how many seconds as long as it's less or equal to
// 10), then you should use `pacemaker.everyFewSeconds()`.

const logger = Logger.get('pacemaker', { level: 'log' });

// Common durations
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
// const ONE_DAY = 24 * ONE_HOUR;

class Task {
  constructor({
    fn,
    timeout,
    once,
    startImmediately,
    args,
  }) {
    this.name = fn.name || '<anon>';
    this.fn = fn;
    this.timeout = timeout;
    this.once = once;
    this.args = args;

    // Setting `last` to `0` means that whenever the next tick happens, this
    // task will be triggerd, no matter how big the `timeout` is.
    this.last = startImmediately ? -timeout : Date.now();
    this.startImmediately = startImmediately;
  }

  run(now) {
    logger.debug('run task:', this.name);
    const t0 = Date.now();
    try {
      this.fn(...this.args);
      this.last = now;
      logger.debug('task', this.name, 'took', Date.now() - t0, 'ms');
    } catch (e) {
      logger.error('error executing task', this.name, e);
    }
  }
}


class Pacemaker {
  constructor() {
    this.freq = null;
    this.timer = null;
    this.tasks = new Set();
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
    this.freq = null;
    this.tasks = new Set();
  }

  /**
   * When tasks are added or removed, make sure that the pacemaker interval is
   * running at a frequency which corresponds to the frequency of the most
   * frequent task. If that is not the case already, then the existing interval
   * is stopped and a new one is started with the correct frequency.
   *
   * If there is currently no registered task, then stop the interval completely.
   */
  _adjustFrequency({ added = [], removed = [] } = {}) {
    logger.debug('_adjustFrequency', { added, removed });

    if (this.tasks.size === 0) {
      logger.log('no task in pacemaker, stop interval');
      this.stop();
      return;
    }

    if (this.freq !== null) {
      // Knowing which tasks were removed and which were added we can check if we
      // actually need to adjust the interval. If a task with interval lower than
      // the current pacemaker interval is added then we need to adjust.
      let minIntervalAdded = Number.MAX_SAFE_INTEGER;
      if (added.length !== 0) {
        for (const { timeout } of added) {
          if (timeout < minIntervalAdded) {
            minIntervalAdded = timeout;
          }
        }
      }

      // If a task with interval equal to the current interval of the pacemaker
      // then we might need to adjust (if this was the only task with this
      // interval).
      let minIntervalRemoved = Number.MAX_SAFE_INTEGER;
      if (removed.length !== 0) {
        for (const { timeout } of removed) {
          if (timeout < minIntervalRemoved) {
            minIntervalRemoved = timeout;
          }
        }
      }

      // If none of the conditions is met then the current interval is un-changed.
      if (minIntervalAdded >= this.freq && minIntervalRemoved > this.freq) {
        return;
      }
    }

    // Get minimum frequency of remaining tasks and use it as base interval
    let minFreq = Number.MAX_SAFE_INTEGER;
    for (const { timeout } of this.tasks) {
      if (timeout < minFreq) {
        minFreq = timeout;
      }
    }
    logger.debug('current minimum timeout:', minFreq);

    // Frequency needs to be adjusted
    if (this.freq === null || this.freq !== minFreq) {
      logger.log('interval timeout change detected', this.freq, '->', minFreq);

      // Reset timeout
      clearTimeout(this.timer);
      this.freq = minFreq;

      // In case some instant task was added, we run a first tick to make sure
      // instant timeouts or intervals are executed straight away. Otherwise, we
      // just set a timeout to trigger a _tick in `this.freq` milliseconds.
      const hasInstantTask = added.some(({ startImmediately }) => startImmediately);
      this._scheduleNextTick(hasInstantTask ? 0 : this.freq);
    }
  }

  /**
   * Schedule next tick
   */
  _scheduleNextTick(timeout) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._tick(), timeout);
  }

  /**
   * Make sure that tasks which should run... run.
   */
  _tick() {
    const now = Date.now();
    logger.debug('_tick', now);

    // Check all tasks
    const removedTasks = [];
    for (const task of this.tasks) {
      if (now >= task.last + task.timeout) {
        task.run(now);

        // delete setTimeout tasks after they run
        if (task.once === true) {
          this.tasks.delete(task);
          removedTasks.push(task);
        }
      }
    }
    logger.debug('duration sync', Date.now() - now);

    // Register timout for next _tick
    this._scheduleNextTick(this.freq);

    // Check if frequency needs to be adjusted
    if (removedTasks.length !== 0) {
      this._adjustFrequency({ removed: removedTasks });
    }
  }

  /**
   * Register a function to be run by the pacemaker. By default it will run
   * periodically like in a setInterval. It's possible to make the function
   * start immediately, or only once like a setTimeout.
   */
  register(fn, {
    timeout,
    once = false,
    startImmediately = false,
    args = [],
  }) {
    if (fn === undefined) {
      throw new Error('fn cannot be undefined');
    }

    if (timeout === undefined) {
      throw new Error('timeout cannot be undefined');
    }

    const task = new Task({
      fn,
      timeout,
      once,
      startImmediately,
      args,
    });

    logger.debug('new task', task);
    this.tasks.add(task);
    this._adjustFrequency({ added: [task] });

    return {
      stop: () => {
        this.tasks.delete(task);
        this._adjustFrequency({ removed: [task] });
      },
    };
  }

  everySecond(fn) {
    return this.register(fn, { timeout: ONE_SECOND });
  }

  everyFewSeconds(fn) {
    return this.register(fn, { timeout: 10 * ONE_SECOND });
  }

  everyMinute(fn) {
    return this.register(fn, { timeout: ONE_MINUTE });
  }

  everyFewMinutes(fn) {
    return this.register(fn, { timeout: 10 * ONE_MINUTE });
  }

  everyHour(fn) {
    return this.register(fn, { timeout: ONE_HOUR });
  }

  /**
   * Whenever a function should run in the background without competing for
   * resources needed by the browser, this helper can be used. It is an
   * efficient way to batch processing.
   */
  nextIdle(fn, ...args) {
    return this.register(fn, { timeout: this.freq, once: true, args });
  }

  setTimeout(fn, timeout, ...args) {
    return this.register(fn, { timeout, once: true, args });
  }

  clearTimeout(timeout) {
    if (timeout && timeout.stop) {
      timeout.stop();
    }
  }

  // NOT USED
  // oneDay(fn) {
  //   return this.register(fn, { timeout: ONE_DAY });
  // }
}

export function service() {
  const pm = new Pacemaker();

  service.unload = () => {
    pm.stop();
  };

  return pm;
}

export default inject.service('pacemaker', [
  'register',
  'everySecond',
  'everyFewSeconds',
  'everyMinute',
  'everyFewMinutes',
  'everyHour',
  'nextIdle',
  'setTimeout',
  'clearTimeout',
]);
