import getDexie from '../../../platform/lib/dexie';

import DefaultMap from '../../../core/helpers/default-map';

import logger from '../logger';
import getSynchronizedDate, { DATE_FORMAT } from '../synchronized-date';
import sortByTs from './utils';

class AggregatedView {
  constructor(db) {
    this.db = db;
  }

  init() {}

  async runTaskAtMostOnce(date, name, fn) {
    const value = await this.db.where('[date+name]').equals([date, name]).toArray();

    // We found an entry for `[date, name]`, so we do not call `fn` again.
    if (value.length !== 0) {
      return;
    }

    // Call aggregation
    await fn();

    // Remember that aggregation was performed
    await this.db.add({ date, name });
  }

  getAggregatedDates() {
    return this.db.orderBy('date').uniqueKeys();
  }

  deleteOlderThan(date) {
    return this.db.where('date').below(date).delete();
  }
}

class BehaviorView {
  constructor(db) {
    this.db = db;
  }

  init() {}

  getTypesForDate(date) {
    return this.db.where('date').equals(date).toArray().then((signals) => {
      // Makes sure that signals are ordered by timestamp
      sortByTs(signals);

      const types = new DefaultMap(() => []);
      for (let i = 0; i < signals.length; i += 1) {
        const { type, behavior } = signals[i];
        types.update(type, (values) => { values.push(behavior); });
      }
      return types;
    });
  }

  add({ type, behavior }) {
    const date = getSynchronizedDate().format(DATE_FORMAT);

    const doc = {
      behavior,
      date,
      type,

      // Add timestamp only for metrics. This is safe as we only use this to
      // order messages and this information is never sent to backend.
      ts: Date.now(),
    };

    logger.debug('add', doc);

    return this.db.add(doc);
  }

  deleteByDate(date) {
    return this.db.where('date').equals(date).delete();
  }
}

class RetentionView {
  constructor(db) {
    this.db = db;
    this.key = 'state';
  }

  init() {}

  getState() {
    return this.db.get(this.key)
      .then((state) => {
        if (!state) {
          return {
            daily: {},
            weekly: {},
            monthly: {},
          };
        }

        return state.value;
      });
  }

  setState(state) {
    return this.db.put({
      key: this.key,
      value: state,
    });
  }
}

class SignalQueueView {
  constructor(db) {
    this.db = db;
  }

  init() {}

  push(signal, attempts = 0) {
    return this.db.add({
      signal,
      attempts,
      date: getSynchronizedDate().format(DATE_FORMAT),
    });
  }

  remove(id) {
    if (typeof id !== 'number') {
      return Promise.resolve();
    }

    return this.db.delete(id);
  }

  getN(n) {
    return this.db.limit(n).toArray();
  }

  getAll() {
    return this.db.toArray();
  }

  getSize() {
    return this.db.count();
  }

  deleteOlderThan(date) {
    return this.db.where('date').below(date).delete();
  }
}

class GidManagerView {
  constructor(db) {
    this.db = db;
    this.cache = new Map();
  }

  init() {
    return this.db.each(({ key, value }) => {
      this.cache.set(key, value);
    });
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value);
    return this.db.put({ key, value });
  }

  entries() {
    const entries = [];
    this.cache.forEach((value, key) => {
      entries.push({
        key,
        value,
      });
    });
    return entries;
  }
}

export default class AnolysisStorage {
  constructor() {
    this.db = null;

    this.aggregated = null;
    this.behavior = null;
    this.retention = null;
    this.signals = null;
    this.gid = null;
  }

  async init() {
    if (this.db !== null) return;

    const Dexie = await getDexie();
    this.db = new Dexie('anolysis');
    this.db.version(1).stores({
      aggregated: '[date+name],date',
      behavior: '++id,date',
      gid: 'key',
      retention: 'key',
      signals: '++id,date',
    });
    await this.db.open();

    // Create views
    this.aggregated = new AggregatedView(this.db.aggregated);
    this.behavior = new BehaviorView(this.db.behavior);
    this.gid = new GidManagerView(this.db.gid);
    this.retention = new RetentionView(this.db.retention);
    this.signals = new SignalQueueView(this.db.signals);

    await Promise.all([
      this.aggregated.init(),
      this.behavior.init(),
      this.gid.init(),
      this.retention.init(),
      this.signals.init(),
    ]);

    const oneMonthAgo = getSynchronizedDate()
      .subtract(30, 'days')
      .format(DATE_FORMAT);

    this.aggregated.deleteOlderThan(oneMonthAgo);
    this.signals.deleteOlderThan(oneMonthAgo);
  }

  async healthCheck() {
    // Try to open `db` if it's not already open
    if (!(await this.db.isOpen())) {
      // Check if database is opened
      await this.db.open();
    }

    // Check for failure
    if (await this.db.hasFailed()) {
      throw new Error('Dexie DB has failed to open');
    }
  }

  async destroy() {
    if (this.db !== null) {
      logger.debug('destroy initialized Dexie DB');
      const db = this.db;
      this.db = null;
      await db.delete();
    } else {
      // Destroy database even when Storage is not initialized
      logger.debug('destroy un-initialized Dexie DB');
      const Dexie = await getDexie();
      await Dexie.delete('anolysis');
    }
  }

  unload() {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }
}
