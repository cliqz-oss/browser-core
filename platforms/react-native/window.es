import setGlobalVars from '@cliqz/indexeddbshim/src/setGlobalVars';
import SQLite from 'react-native-sqlite-2';


setGlobalVars(
  global,
  {
    checkOrigin: false,
    origin: 'react',
    win: SQLite,
    deleteDatabaseFiles: false,
    useSQLiteIndexes: true,
  }
);

export default global;
