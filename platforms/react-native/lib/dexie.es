import SQLite from 'react-native-sqlite-2';
import Dexie from '@cliqz-oss/dexie';
import setGlobalVars from '@cliqz/indexeddbshim/src/setGlobalVars';

export default function () {
  const w = {};

  setGlobalVars(
    w,
    {
      checkOrigin: false,
      origin: 'react',
      win: SQLite,
      deleteDatabaseFiles: false,
      useSQLiteIndexes: true,
    }
  );

  class MyDexie extends Dexie {
    constructor(name) {
      super(name, {
        indexedDB: w.indexedDB,
        IDBKeyRange: w.IDBKeyRange,
      });
    }
  }

  return Promise.resolve(MyDexie);
}
