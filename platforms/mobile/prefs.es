import Storage from '../core/storage';
const storage = new Storage();

export function getPref(pref, fallback) {
  // local storage saves only strings
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
  return fallback;
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
