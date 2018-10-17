import pouchdb from 'pouchdb';

export default (name, ...rest) => pouchdb(`tmp/${name}`, ...rest);
