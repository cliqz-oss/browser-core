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

export const PLATFORM_TELEMETRY_WHITELIST = (chrome === undefined || chrome.cliqz === undefined)
  ? []
  : [
    'pref.cliqz.blue.theme',
    'pref.search.quicksearch.enabled',
    'searchui.cards.layout',
  ];

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

function cleanPref(pref) {
  if (pref.startsWith('extensions.cliqz.')) {
    return pref.substr('extensions.cliqz.'.length);
  }
  return pref;
}

export function getAllCliqzPrefs() {
  return Object.keys(prefs);
}

export function getPref(prefKey, notFound, browserPrefix = null) {
  if (browserPrefix !== null) {
    if (chrome && chrome.cliqz && chrome.cliqz.getPref) {
      return chrome.cliqz.getPref(`${browserPrefix}${prefKey}`);
    }

    console.warn(`getting pref ${browserPrefix}${prefKey} with browser prefix when chrome.cliqz is not available (ignored)`);
    return notFound;
  }

  const pref = cleanPref(prefKey);
  if (!initialised) {
    console.warn(`loading pref ${pref} before prefs were initialised, you will not get the correct result`);
    return prefs[pref] || notFound;
  }

  if (prefs && prefs[pref] !== undefined) {
    return prefs[pref];
  }
  return notFound;
}

export function setPref(prefKey, value, browserPrefix = null) {
  if (browserPrefix !== null) {
    if (chrome && chrome.cliqz && chrome.cliqz.setPref) {
      return chrome.cliqz.setPref(`${browserPrefix}${prefKey}`, value);
    }
    console.warn(`setting pref ${browserPrefix}${prefKey} with browser prefix when chrome.cliqz is not available (ignored)`);
  }

  const pref = cleanPref(prefKey);
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

export function hasPref(prefKey, browserPrefix = null) {
  if (browserPrefix !== null) {
    if (chrome && chrome.cliqz && chrome.cliqz.hasPref) {
      return chrome.cliqz.hasPref(`${browserPrefix}${prefKey}`);
    }

    console.warn(`getting pref ${browserPrefix}${prefKey} with browser prefix when chrome.cliqz is not available (ignored)`);
    return false;
  }

  const pref = cleanPref(prefKey);
  return pref in prefs;
}

export function clearPref(prefKey, browserPrefix = null) {
  if (browserPrefix !== null) {
    if (chrome && chrome.cliqz && chrome.cliqz.clearPref) {
      return chrome.cliqz.clearPref(`${browserPrefix}${prefKey}`);
    }

    console.warn(`getting pref ${browserPrefix}${prefKey} with browser prefix when chrome.cliqz is not available (ignored)`);
    return false;
  }

  const pref = cleanPref(prefKey);
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
