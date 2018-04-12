const Dexie = require('@cliqz-oss/dexie');
const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
const indexedDB = require('fake-indexeddb');

function initDexie(name) {
  return new Dexie(name, {
    indexedDB,
    IDBKeyRange,
  });
}

module.exports = {
  'platform/lib/dexie': {
    default: () => Promise.resolve(initDexie),
  },
};
