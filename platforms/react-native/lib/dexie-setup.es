import setGlobalVars from '@cliqz/indexeddbshim/src/setGlobalVars';
import SQLite from 'react-native-sqlite-2';


setGlobalVars(
  global,
  {
    checkOrigin: true,
    win: SQLite,
    deleteDatabaseFiles: false,
    useSQLiteIndexes: true,
    origin: 'cliqz.com',
  }
);
