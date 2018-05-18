import pouchdb from '@cliqz-oss/pouchdb';

export default (name, ...rest) => pouchdb(`tmp/${name}`, ...rest);
