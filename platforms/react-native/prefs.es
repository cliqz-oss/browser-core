/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AsyncStorage, NativeModules, DeviceEventEmitter } from 'react-native';
import events from '../core/events';

let PREFIX = '@cliqzprefs:';
export const PLATFORM_TELEMETRY_WHITELIST = ['lumen.protection.isEnabled', 'lumen.subscription'];

const prefs = {};

let _setPref = (key, value) => AsyncStorage.setItem(key, JSON.stringify(value));
let _getAllPrefs = () => {
  const allPrefs = {};
  return AsyncStorage.getAllKeys().then((keys) => {
    const prefKeys = keys.filter(k => k.startsWith(PREFIX));
    return AsyncStorage.multiGet(prefKeys).then((result) => {
      result.forEach((prefPair) => {
        allPrefs[prefPair[0].substring(PREFIX.length)] = JSON.parse(prefPair[1]);
      });
      return allPrefs;
    });
  });
};
let _clearPref = AsyncStorage.removeItem.bind(AsyncStorage);

if (NativeModules.Prefs) {
  _clearPref = NativeModules.Prefs.clearPref;
  _setPref = NativeModules.Prefs.setPref;
  _getAllPrefs = NativeModules.Prefs.getAllPrefs;
  PREFIX = '';

  DeviceEventEmitter.addListener('prefchange', ([prefKey, value]) => {
    prefs[prefKey] = value;
    events.pub('prefchange', prefKey);
  });
}

// load prefs from storage
export function init() {
  return _getAllPrefs().then((allPrefs) => {
    Object.keys(allPrefs).forEach((key) => {
      const value = allPrefs[key];
      prefs[key] = value;
    });
  });
}

export function getPref(prefKey, defaultValue) {
  if (prefs && prefs[prefKey] !== undefined) {
    return prefs[prefKey];
  }
  return defaultValue;
}

export function setPref(prefKey, value) {
  const changed = prefs[prefKey] !== value;

  if (changed) {
    prefs[prefKey] = value;
    _setPref(PREFIX + prefKey, value);

    // trigger prefchange event
    events.pub('prefchange', prefKey);
  }
}

export function hasPref(prefKey) {
  return prefKey in prefs;
}

export function clearPref(prefKey) {
  delete prefs[prefKey];
  _clearPref(PREFIX + prefKey);
}

export function getAllCliqzPrefs() {
  return Object.keys(prefs);
}
