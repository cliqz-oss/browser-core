import getDexie from '../../../platform/lib/dexie';

import PouchDB from '../../../core/database';
import DefaultMap from '../../../core/helpers/default-map';

import logger from '../logger';
import getSynchronizedDate, { DATE_FORMAT } from '../synchronized-date';


/**
 * Clean-up all past storage of anolysis.
 */
function migrate() {
  return Promise.all([
    'cliqz-anolysis-aggregated-behavior',
    'cliqz-anolysis-aggregation-log',
    'cliqz-anolysis-behavior',
    'cliqz-anolysis-demographics',
    'cliqz-anolysis-retention-log',
    'cliqz-anolysis-signals',
    'cliqz-telemetry-behavior',
    'cliqz-telemetry-demographics',
  ].map(name => new PouchDB(name).destroy().catch(() => {})));
}


class AggregatedView {
  constructor(db) {
    this.db = db;
  }

  init() {
  }

  ifNotAlreadyAggregated(date, fn) {
    return this.db.get({ date }).then((aggregation) => {
      if (aggregation === undefined) {
        return fn();
      }

      return Promise.resolve();
    });
  }

  getAggregatedDates() {
    return this.db.toCollection().primaryKeys();
  }

  storeAggregation(date) {
    return this.db.add({ date });
  }

  deleteOlderThan(date) {
    return this.db.where('date').below(date).delete();
  }
}

class BehaviorView {
  constructor(db) {
    this.db = db;
  }

  init() {
  }

  getTypesForDate(date) {
    return this.db.where('date').equals(date).toArray().then((signals) => {
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

  init() {
  }

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

  init() {
  }

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

  init() {
    if (this.db !== null) return Promise.resolve();

    return getDexie().then((Dexie) => {
      this.db = new Dexie('anolysis');
      this.db.version(1).stores({
        aggregated: 'date',
        behavior: '++id,date',
        retention: 'key',
        signals: '++id,date',
      });

      // Gid information are now stored in Dexie as well instead of preferences.
      // This allows to uniformize storage in the codebase as well as test
      // anolysis better. Moreover, preferences do not seem like a good way
      // to store data.
      this.db.version(2).stores({
        gid: 'key'
      });

      this.db.on('populate', () => {
        // populate is only called the first time the database is created, which
        // is the only time we would want to call `migrate()` to delete previous
        // storage.
        migrate();
      });

      return this.db.open();
    }).then(() => {
      this.aggregated = new AggregatedView(this.db.aggregated);
      this.behavior = new BehaviorView(this.db.behavior);
      this.gid = new GidManagerView(this.db.gid);
      this.retention = new RetentionView(this.db.retention);
      this.signals = new SignalQueueView(this.db.signals);

      return Promise.all([
        this.aggregated.init(),
        this.behavior.init(),
        this.gid.init(),
        this.retention.init(),
        this.signals.init(),
      ]);
    }).then(() => {
      const oneMonthAgo = getSynchronizedDate().subtract(30, 'days').format(DATE_FORMAT);
      return Promise.all([
        this.aggregated.deleteOlderThan(oneMonthAgo),
        this.signals.deleteOlderThan(oneMonthAgo),
      ]);
    });
  }

  destroy() {
    if (this.db !== null) {
      return this.db.delete();
    }

    // Destroy database even when Storage is not initialized
    return getDexie().then(Dexie => Dexie.delete('anolysis'));
  }

  unload() {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }
}
