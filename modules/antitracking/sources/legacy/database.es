import { deletePersistantObject } from '../../core/persistent-state';
import prefs from '../../core/prefs';
import Database from '../../core/database';

/**
 * Remove any old database entries which are no longer needed
 */
export default function () {
  deletePersistantObject('requestKeyValue');
  deletePersistantObject('checkedToken');
  deletePersistantObject('blockedToken');
  deletePersistantObject('loadedPage');
  if (prefs.get('attrack.tokenDbState', 0) === 0) {
    const db = new Database('cliqz-attrack-tokens', { auto_compaction: true });
    db.destroy();
    prefs.set('attrack.tokenDbState', 1);
  }
}

export function migrateTokenDomain(tokenDomain, tokenDomainCountThreshold) {
  const oldDb = new Database('cliqz-attrack-token-domain', { auto_compaction: true });
  return oldDb.allDocs({ include_docs: true }).then(docs => docs.rows
    .filter(row => Object.keys(row.doc.fps).length >= tokenDomainCountThreshold)
    .map(doc => doc.id)
  ).then((toks) => {
    toks.forEach(tok => tokenDomain.addBlockedToken(tok));
    return oldDb.destroy();
  });
}

export function migrateRequestKeyValue() {
  const oldDb = new Database('cliqz-attrack-request-key-value', { auto_compaction: true });
  return oldDb.destroy();
}
