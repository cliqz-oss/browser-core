/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import events from '../core/events';
import console from '../core/console';
import { chrome } from '../platform/globals';

const PREFS_KEY = 'cliqzprefs';
let initialised = false;
const prefs = {};

function syncToStorage() {
  chrome.storage.local.set({ [PREFS_KEY]: prefs });
}

export function init() {
  return new Promise((resolve) => {
    chrome.storage.local.get([PREFS_KEY], (result) => {
      Object.assign(prefs, result[PREFS_KEY] || {});
      initialised = true;
      resolve();
    });
  });
}

export function getAllCliqzPrefs() {
  return Object.keys(prefs);
}

export function getPref(pref, notFound) {
  if (!initialised) {
    console.warn(`loading pref ${pref} before prefs were initialised, you will not get the correct result`);
    return prefs[pref] || notFound;
  }

  if (prefs && prefs[pref] !== undefined) {
    return prefs[pref];
  }
  return notFound;
}

export function setPref(pref, value) {
  const changed = prefs[pref] !== value;

  prefs[pref] = value;

  // trigger prefchange event
  if (changed) {
    events.pub('prefchange', pref, 'set');
  }

  if (!initialised) {
    console.warn(`setting pref ${pref} before prefs were initialised, you will not get the correct result`);
    return Promise.resolve();
  }

  if (changed) {
    syncToStorage();
  }
  return Promise.resolve();
}

export function hasPref(pref) {
  return pref in prefs;
}

export function clearPref(pref) {
  delete prefs[pref];

  // trigger prefchange event
  events.pub('prefchange', pref, 'clear');

  syncToStorage();
  return true;
}

export function getCliqzPrefs() {
  function filterer(entry) {
    // avoid privay leaking prefs ('backup').
    // avoid irrelevant deep prefs (something.otherthing.x.y)
    // avoid prefs sending domains.
    // allow 'enabled' prefs
    return ((
      entry.indexOf('.') === -1
      && entry.indexOf('backup') === -1
      && entry.indexOf('attrackSourceDomainWhitelist') === -1
    )
      || entry.indexOf('.enabled') !== -1);
  }

  const cliqzPrefs = {};
  const cliqzPrefsKeys = getAllCliqzPrefs().filter(filterer);

  for (let i = 0; i < cliqzPrefsKeys.length; i += 1) {
    cliqzPrefs[cliqzPrefsKeys[i]] = getPref(cliqzPrefsKeys[i]);
  }

  return cliqzPrefs;
}
