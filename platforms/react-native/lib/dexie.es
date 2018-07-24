// react native window should always be imported before
// in order to set global variables e.g. indexedDB
import Dexie from '@cliqz-oss/dexie';

export default function getDexie() {
  return Promise.resolve(Dexie);
}
