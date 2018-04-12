/* eslint-disable import/no-extraneous-dependencies */
import Dexie from 'dexie';
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import indexedDB from 'fake-indexeddb';


class MyDexie extends Dexie {
  constructor(name) {
    // This will allow several instances of the same database to exist in
    // memory at the same time. It will work only because Dexie will only ever
    // live in memory, and will not be persisted accross restart.
    const randName = name + Math.floor(Math.random() * 1000000);
    super(randName, {
      indexedDB,
      IDBKeyRange,
    });
  }
}


export default function () {
  return Promise.resolve(MyDexie);
}
