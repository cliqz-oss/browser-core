/* eslint no-console: 'off' */

import events from '../core/events';

const PREFS_KEY = 'cliqzprefs';
let initialised = false;
const prefs = {};

export function init() {
  return new Promise((resolve) => {
    chrome.storage.local.get(PREFS_KEY, (result) => {
      Object.assign(prefs, result[PREFS_KEY] || {});
      initialised = true;
      resolve();
    });
  });
}

function syncToStorage() {
  chrome.storage.local.set({ [PREFS_KEY]: prefs });
}

export function getPref(prefKey, notFound) {
  if (!initialised) {
    console.warn(`loading pref ${prefKey} before prefs were initialised, you will not get the correct result`);
    return prefs[prefKey] || notFound;
  }
  if (prefs && prefs[prefKey] !== undefined) {
    return prefs[prefKey];
  }
  return notFound;
}

export function setPref(prefKey, value) {
  const changed = prefs[prefKey] !== value;

  if (changed) {
    prefs[prefKey] = value;
    syncToStorage();
    // trigger prefchange event
    events.pub('prefchange', prefKey);
  }
}

export function hasPref(pref) {
  return pref in prefs;
}

export function clearPref(pref) {
  delete prefs[pref];
  syncToStorage();
}

export function enableChangeEvents() {
  throw new Error('not implemented - prefs.enableChangeEvents');
}

export function disableChangeEvents() {
  throw new Error('not implemented - prefs.disableChangeEvents');
}
