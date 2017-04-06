import { AsyncStorage } from 'react-native';
import events from '../core/events';
import config from '../core/config';

const PREFIX = "@cliqzprefs:"

const prefs = config.default_prefs || {};

// load prefs from storage
export function loadPrefs() {
  console.log("load prefs from storage");
  return AsyncStorage.getAllKeys().then(keys => {
    const prefKeys = keys.filter((k) => k.startsWith(PREFIX));
    return AsyncStorage.multiGet(prefKeys).then(result => {
      if (!result) {
        return;
      }
      result.forEach((prefPair) => {
        prefs[prefPair[0].substring(PREFIX.length)] = JSON.parse(prefPair[1]);
      });
      console.log(prefs);
    });
  });
}

export function getPref(prefKey, defaultValue) {
  if (prefs && prefs[prefKey] !== undefined) {
    return prefs[prefKey];
  } else {
    return defaultValue
  }
}

export function setPref(prefKey, value) {
  const changed = prefs[prefKey] !== value;

  if (changed) {
    prefs[prefKey] = value;
    AsyncStorage.setItem(PREFIX + prefKey, JSON.stringify(value));

    // trigger prefchange event
    events.pub('prefchange', prefKey);
  }
}

export function hasPref(prefKey) {
  return prefKey in prefs;
}

export function clearPref(prefKey) {
  delete prefs[prefKey];
  AsyncStorage.removeItem(PREFIX + prefKey);
}
