const Dexie = require('@cliqz-oss/dexie');
const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
const indexedDB = require('fake-indexeddb');

global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

function initDexie(name) {
  return new Dexie(name, {
    indexedDB,
    IDBKeyRange,
  });
}

initDexie.__proto__.delete = Dexie.delete; // eslint-disable-line no-proto
initDexie.__proto__.exists = Dexie.exists; // eslint-disable-line no-proto

module.exports = {
  'platform/lib/dexie': {
    default: () => Promise.resolve(initDexie),
  },
};
