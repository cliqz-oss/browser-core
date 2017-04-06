import Storage from '../core/storage';
import events from '../core/events';

const storage = new Storage();

export function getPref(pref, notFound) {
  const mypref = storage.getItem(pref);
  if (mypref) {
    if (mypref === 'false') {
      return false;
    }
    if (mypref === 'true') {
      return true;
    }
    if (!isNaN(mypref)) {
      return parseInt(mypref, 10);
    }
    return mypref;
  }
  return notFound;
}

export function setPref(pref, val) {
  storage.setItem(pref, val);
  events.pub('prefchange', pref);
}

export function hasPref(pref) {
  return storage.getItem(pref) !== null;
}

export function clearPref(pref) {
  storage.removeItem(pref);
}

export function enableChangeEvents() {
  throw new Error('not implemented - prefs.enableChangeEvents');
}

export function disableChangeEvents() {
  throw new Error('not implemented - prefs.disableChangeEvents');
}
