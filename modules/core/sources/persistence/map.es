import PersistentMap from '../../platform/persistent-map';
import MemoryPersistentMap from '../helpers/memory-map';

/**
 * Check if basic operations can be performed on persistent map, in which case
 * it is considered healthy. Otherwise, we might want to fallback to an
 * in-memory storage instead, which exposes the same API but does not persist
 * anything.
 */
async function isStorageAvailable() {
  try {
    const map = new PersistentMap('test_db');
    await map.init();
    await map.set('foo', 'bar');
    await map.get('foo');
    await map.destroy();
  } catch (ex) {
    return false;
  }

  return true;
}

/**
 * Factory used to create a persistent map and fallback to in-memory storage if
 * persistence is not available (e.g.: private mode).
 */
export default async function factory() {
  if (await isStorageAvailable()) {
    return PersistentMap;
  }
  return MemoryPersistentMap;
}
