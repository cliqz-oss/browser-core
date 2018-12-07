import getDexie from '../../platform/lib/dexie';
import assert from '../assert';


export function sortEventsByTs(events) {
  return events.sort((a, b) => {
    if (a.ts < b.ts) {
      return -1;
    }
    if (a.ts > b.ts) {
      return 1;
    }
    return 0;
  });
}


export default class EventStream {
  constructor(name) {
    this.name = name;
    this.store = null;
  }

  async init() {
    const Dexie = await getDexie();
    this.store = new Dexie(this.name);
    this.store.version(1).stores({
      events: '++id,ts'
    });
    return this.store.open();
  }

  unload() {
    if (this.store !== null) {
      this.store.close();
      this.store = null;
    }
  }

  /**
   * Reset the underlying database and get rid of all the data.
   * WARNING - after `destroy`, using this instance of `EventStream` will be
   * undefined behavior. You should create a new one, or call `init` again.
   */
  destroy() {
    if (this.store === null) {
      return getDexie().then(Dexie => Dexie.delete(this.name));
    }

    return this.store.delete();
  }

  deleteDataOlderThan(ts) {
    return this.store.events.where('ts').below(ts).delete();
  }

  info() {
    let total = 0;
    let totalTokens = 0;
    return this.store.events.each((event) => {
      total += 1;
      totalTokens += event.tokens.length;
    }).then(() => ({
      numberOfEntries: total,
      numberOfTokens: totalTokens, // each token is 32 bits
    }));
  }

  // NOTE - by design there is no way to remove a particular event from the
  // store. The only way is to destroy it.

  /**
   * Insert an event and make sure the underlying representation stays sorted
   */
  push(event) {
    assert(event.ts !== undefined, '`event` MUST have a `ts` attribute');
    return this.pushMany([event]);
  }

  pushMany(events) {
    return this.store.events.bulkAdd(events);
  }

  latestTs() {
    return this.store.events
      .orderBy('ts')
      .last()
      .then(event => event && event.ts);
  }

  query({ before, after } = {}) {
    let collection;

    if (before !== undefined && after !== undefined) {
      collection = this.store.events
        .where('ts')
        .between(after, before, false, false);
    } else if (before !== undefined) {
      collection = this.store.events
        .where('ts')
        .below(before);
    } else if (after !== undefined) {
      collection = this.store.events
        .where('ts')
        .above(after);
    } else {
      collection = this.store.events;
    }

    return collection
      .toArray()
      .then(sortEventsByTs);
  }
}
