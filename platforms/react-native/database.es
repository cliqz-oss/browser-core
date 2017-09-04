/**
 * PouchDB using sqlite adapter
 * see https://github.com/craftzdog/react-native-sqlite-2
 */
import PouchDB from 'pouchdb-react-native';
import SQLite from 'react-native-sqlite-2';
import SQLiteAdapterFactory from 'pouchdb-adapter-react-native-sqlite';

const SQLiteAdapter = SQLiteAdapterFactory(SQLite);
PouchDB.plugin(SQLiteAdapter);

export default function (dbName, options) {
  return new PouchDB(dbName, Object.assign({ adapter: 'react-native-sqlite' }, options));
}
