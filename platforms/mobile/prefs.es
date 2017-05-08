import Storage from '../core/storage';

const storage = new Storage();

export function getPref(pref, fallback) {
  return storage.getItem(pref) || fallback;
}

export function setPref(pref, val) {
  storage.setItem(pref, val);
}

export function hasPref(pref, val) {
  return Boolean(storage.getItem(pref));
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
