import Storage from 'core/storage';

const storage = new Storage();

export function getPref(pref, fallback) {
  return storage.getItem(pref) || fallback;
}

export function setPref(pref, val) {
  storage.setItem(pref, val);
}
