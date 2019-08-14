import DefaultMap from '../../../core/helpers/default-map';
import logger from '../logger';
import getSynchronizedDate, { DATE_FORMAT } from '../synchronized-date';
import sortByTs from './utils';

class AggregatedView {
  constructor() {
    this.db = new DefaultMap(() => new Set());
  }

  async runTaskAtMostOnce(date, name, fn) {
    const tasks = this.db.get(date);
    if (!tasks.has(name)) {
      await fn();
      tasks.add(name);
    }
  }

  async getAggregatedDates() {
    return [...this.db.keys()];
  }

  async deleteOlderThan(date) {
    const dates = [...this.db.keys()];
    for (let i = 0; i < dates.length; i += 1) {
      if (dates[i] < date) {
        this.db.delete(dates[i]);
      }
    }
  }
}

class BehaviorView {
  constructor() {
    this.db = new DefaultMap(() => []);
  }

  getTypesForDate(date) {
    // Makes sure that signals are ordered by timestamp
    const signals = sortByTs(this.db.get(date));
    const types = new DefaultMap(() => []);
    for (let i = 0; i < signals.length; i += 1) {
      const { type, behavior } = signals[i];
      types.update(type, (values) => { values.push(behavior); });
    }
    return Promise.resolve(types);
  }

  add({ type, behavior }) {
    const date = getSynchronizedDate().format(DATE_FORMAT);

    const doc = {
      behavior,
      date,
      type,
      ts: Date.now(),
    };

    logger.debug('add', doc);

    return Promise.resolve(this.db.update(date, (array) => { array.push(doc); }));
  }

  deleteByDate(date) {
    this.db.delete(date);
    return Promise.resolve();
  }
}

class SignalQueueView {
  constructor() {
    this.id = 1;
    this.db = new Map();
  }

  push(signal, attempts = 0) {
    const id = this.id;
    this.id += 1;

    this.db.set(id, {
      id,
      signal,
      attempts,
      date: getSynchronizedDate().format(DATE_FORMAT),
    });
    return Promise.resolve();
  }

  remove(id) {
    if (this.db.has(id)) {
      this.db.delete(id);
    }

    return Promise.resolve();
  }

  getN(n) {
    return Promise.resolve([...this.db.values()].slice(0, n));
  }

  getAll() {
    return Promise.resolve([...this.db.values()]);
  }

  getSize() {
    return Promise.resolve(this.db.size);
  }

  deleteOlderThan(date) {
    [...this.db.entries()].forEach(([key, entry]) => {
      if (entry.date < date) {
        this.db.delete(key);
      }
    });
    return Promise.resolve();
  }
}

export default class AnolysisStorage {
  constructor() {
    this.unload();
  }

  init() {
    if (this.aggregated === null) {
      this.aggregated = new AggregatedView();
    }

    if (this.behavior === null) {
      this.behavior = new BehaviorView();
    }

    if (this.signals === null) {
      this.signals = new SignalQueueView();
    }

    return Promise.resolve();
  }

  healthCheck() {
    return true;
  }

  destroy() {
    return Promise.resolve();
  }

  unload() {
    this.aggregated = null;
    this.behavior = null;
    this.signals = null;
  }
}
