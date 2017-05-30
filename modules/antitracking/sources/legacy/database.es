import console from '../../core/console';
import { deletePersistantObject, LazyPersistentObject } from '../persistent-state';
import utils from '../../core/utils';
import Database from '../../core/database';

/**
 * Remove any old database entries which are no longer needed
 */
export default function () {
  deletePersistantObject('requestKeyValue');
  deletePersistantObject('checkedToken');
  deletePersistantObject('blockedToken');
  deletePersistantObject('loadedPage');
  if (utils.getPref('attrack.tokenDbState', 0) === 0) {
    const db = new Database('cliqz-attrack-tokens', { auto_compaction: true });
    db.destroy();
    utils.setPref('attrack.tokenDbState', 1);
  }
}

export function migrateTokenDomain(tokenDomain) {
  const dbName = 'tokenDomain';
  const oldTokenDomain = new LazyPersistentObject(dbName);
  return oldTokenDomain.load().then((tokens) => {
    // tokens format:
    // {token: {firstparty: date}}
    const tokenArrayTuples = Object.keys(tokens).map(token => (
      // get array of (token, firstParty, day) tuples for this tuple
      Object.keys(tokens[token]).map(firstParty => [token, firstParty, tokens[token][firstParty]])
    ));
    // flatten array of arrays of tuples into array of tuples
    const tokenTuples = [].concat(...tokenArrayTuples);
    console.log('migrate', tokenTuples.length, 'tokenDomain tuples');
    // insert all the tuples into the new token db
    return Promise.all(
      tokenTuples.map(tup => tokenDomain.addTokenOnFirstParty(...tup))).then(() => {
        deletePersistantObject(dbName);
      }
    );
  });
}
