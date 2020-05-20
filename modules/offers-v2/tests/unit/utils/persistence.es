const cloneObject = require('./utils').cloneObject;

let persistenceMap = {};
let simpleDb = {};

module.exports = {
  'core/persistence/simple-db': {
    reset() {
      simpleDb = {};
    },

    default: class {
      upsert(docID, docData) {
        return new Promise((resolve) => {
          simpleDb[docID] = cloneObject(docData);
          resolve();
        });
      }

      get(docID) {
        return new Promise((resolve) => {
          if (simpleDb[docID]) {
            resolve(cloneObject(simpleDb[docID]));
          } else {
            resolve(null);
          }
        });
      }

      remove(docID) {
        return new Promise((resolve) => {
          if (simpleDb[docID]) {
            delete simpleDb[docID];
          }
          resolve(true);
        });
      }
    }
  },

  'core/persistence/map': {
    reset() {
      persistenceMap = {};
    },

    default: () => class MockMap {
      constructor(dbName) {
        persistenceMap[dbName] = (persistenceMap[dbName] || new Map());
        this.db = persistenceMap[dbName];
      }

      init() {
        return Promise.resolve();
      }

      unload() {
        return Promise.resolve();
      }

      get(key) {
        return this.db.get(key);
      }

      set(key, value) {
        return this.db.set(key, value);
      }

      bulkSetFromMap(keys) {
        keys.forEach((value, key) => this.set(key, value));
      }

      has(key) {
        return this.db.has(key);
      }

      delete(key) {
        return this.db.delete(key);
      }

      bulkDelete(keys) {
        keys.forEach(key => this.delete(key));
      }

      clear() {
        return this.db.clear();
      }

      size() {
        return this.db.size();
      }

      keys() {
        return [...this.db.keys()];
      }

      entries() {
        return [...this.db.entries()];
      }
    }
  },

  lib: {
    getEmptyOfferDB: async (system, odbIn) => {
      let odb = odbIn;
      if (!odb) {
        const OfferDB = (await system.import('offers-v2/offers/offers-db')).default;
        odb = new OfferDB();
        await odb.loadPersistentData();
      }
      const offerIds = odb.getOffers(/* includeRemoved */ true).map(o => o.offer_id);
      offerIds.forEach(offerId => odb.eraseOfferObject(offerId));
      return odb;
    },
    reset() {
      persistenceMap = {};
      simpleDb = {};
    },
    async dexieReset(system) {
      const PersistentMap = (await system.import('platform/persistent-map')).default;
      for (const dbname of ['cliqz-categories-data', 'cliqz-categories-patterns']) {
        const map = new PersistentMap(dbname);
        // eslint-disable-next-line no-await-in-loop
        await (async () => {
          await map.init();
          await map.clear();
          await map.destroy();
          await map.unload();
        })();
      }
    }
  },
};
