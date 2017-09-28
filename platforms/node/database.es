import PouchDB from 'pouchdb-react-native'

export default function(dbName, options) {
  return new PouchDB(dbName, options);
}
