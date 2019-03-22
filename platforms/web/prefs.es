import Storage from '../core/storage';

export const PLATFORM_TELEMETRY_WHITELIST = [];

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

export function hasPref(pref) {
  return Boolean(storage.getItem(pref));
}

export function clearPref(pref) {
  storage.removeItem(pref);
}

export function init() {
  return Promise.resolve();
}

export function getAllCliqzPrefs() {
}
