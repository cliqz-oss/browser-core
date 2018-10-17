import getDexie from '../platform/lib/dexie';

const ENGINES = {
  dexie: async () => {
    const Dexie = await getDexie();
    const db = new Dexie('offers-patterns-stat');
    db.version(1).stores({ views: '++id' });
    return db;
  }
};

export default class PatternsStat {
  constructor() {
    this.db = null;
  }

  async init({ engine = 'dexie' } = {}) {
    this.db = await typeof engine === 'string' ? ENGINES[engine]() : engine;
  }

  async add(collection, data = {}) {
    const db = await this.db;
    db[collection].add(data);
  }

  async moveAll(collection) {
    const data = this.group(collection);
    const db = await this.db;
    db[collection].clear();
    return data;
  }

  async group(collection) {
    const map = new Map();
    const db = await this.db;
    await db[collection].each(item => this.collector(collection, item, map));
    return [...map.values()];
  }

  collector(collection, { campaignId, pattern }, map) {
    const key = `${campaignId},${pattern}`;
    const defaultValue = {
      counter: 0,
      campaignId,
      pattern,
      type: collection
    };
    const item = map.get(key) || defaultValue;
    item.counter += 1;
    map.set(key, item);
  }
}
