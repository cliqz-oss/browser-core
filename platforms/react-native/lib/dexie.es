import './dexie-setup';
import Dexie from '@cliqz-oss/dexie';

export default function getDexie() {
  return Promise.resolve(Dexie);
}
