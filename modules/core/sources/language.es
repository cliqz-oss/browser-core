/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*
 * This module determines the language of visited pages and
 * creates a list of known languages for a user
 *
 */

import console from '../core/console';
import i18n from '../core/i18n';
import prefs from '../core/prefs';
import { strip } from '../core/url';
import pacemaker from '../core/services/pacemaker';

const fallbackWhitelist = JSON.stringify([
  'de,en',
  'de',
  'en',
  'en,de',
  'fr',
  'fr,en',
  'en,fr',
  'nl',
  'es',
  'en,es',
  'en,nl',
  'de,fr',
  'de,es',
  'nl,en',
  'de,ru',
  'it',
  'en,ru',
  'en,it',
  'en,zh',
  'es,en',
]);

// we keep a different preferences namespace than cliqz so that it does not get
// removed after a re-install or sent during a logging signal
const CliqzLanguage = {
  DOMAIN_THRESHOLD: 3,
  READING_THRESHOLD: 10000,
  LOG_KEY: 'CliqzLanguage',
  LOCALE_HASH: 333,
  currentState: {},
  qs: '',
  cron: 24 * 60 * 60 * 1000, // default one day
  removeHashId: null,

  getLocale() {
    return i18n.PLATFORM_LANGUAGE_FILTERED;
  },

  // load from the about:config settings
  init(window) {
    CliqzLanguage.window = window;

    if (this.removeHashId === null) {
      this.removeHashId = pacemaker.everyHour(this.updateTicker.bind(this));
    }

    if (prefs.has('extensions.cliqz-lang.data')) {
      try {
        // catch empty value or malformed json
        CliqzLanguage.currentState = JSON.parse(
          prefs.get('extensions.cliqz-lang.data', {})
        );
      } catch (e) {
        // empty
      }
    }
    const localeLangs = [];
    let maxValue = 0;
    // transform legacy data
    Object.keys(CliqzLanguage.currentState).forEach((lang) => {
      if (CliqzLanguage.currentState[lang] === 'locale'
        || CliqzLanguage.currentState[lang].indexOf(257) !== -1) {
        localeLangs.push(lang);
      }

      if (CliqzLanguage.currentState[lang] instanceof Array) {
        maxValue = Math.max(maxValue, CliqzLanguage.currentState[lang].length);
      }
    });

    if (localeLangs.length) {
      const maxLen = Math.max(CliqzLanguage.DOMAIN_THRESHOLD + 1, maxValue);

      for (const locale of localeLangs) {
        const originalArray = CliqzLanguage.currentState[locale];
        if (originalArray === 'locale') {
          CliqzLanguage.currentState[locale] = CliqzLanguage.createHashes(maxLen);
        } else if (originalArray.length < maxLen) {
          CliqzLanguage.currentState[locale] = CliqzLanguage.createHashes(maxLen);
        }

        // add 'locale' hash
        CliqzLanguage.currentState[locale][0] = CliqzLanguage.LOCALE_HASH;
      }
    }

    const ll = CliqzLanguage.getLocale();
    if (ll && CliqzLanguage.currentState[ll] === null) {
      // we found new locale
      CliqzLanguage.currentState[ll] = CliqzLanguage
        .createHashes(CliqzLanguage.DOMAIN_THRESHOLD + 1);
      // add 'locale' hash
      CliqzLanguage.currentState[ll][0] = CliqzLanguage.LOCALE_HASH;
    }

    CliqzLanguage.cleanCurrentState();
    console.log(CliqzLanguage.stateToQueryString(), CliqzLanguage.LOG_KEY);
  },
  unload() {
    pacemaker.clearTimeout(this.removeHashId);
    this.removeHashId = null;
  },
  updateTicker() {
    let lastUpdate = 0;
    if (prefs.has('extensions.cliqz-lang.lastUpdate')) {
      try {
        lastUpdate = parseInt(prefs.get('extensions.cliqz-lang.lastUpdate', 0), 10);
      } catch (e) {
        lastUpdate = 0;
      }
    }
    const currentTime = Date.now();
    if (currentTime > this.cron + lastUpdate) {
      this.removeHash();
      prefs.set('extensions.cliqz-lang.lastUpdate', String(currentTime));
    }
  },
  // create array of unique hashes
  createHashes(maxLen) {
    const hashes = [];
    let i = 0;
    while (i < maxLen) {
      // random hash value: [-256, 255]
      const r = Math.floor(Math.random() * 512) - 256;
      if (hashes.indexOf(r) === -1) {
        hashes.push(r);
        i += 1;
      }
    }
    return hashes;
  },
  // add locale, this is the function hook that will be called for every page load that
  // stays more than 5 seconds active
  addLocale(url, localeStr) {
    const locale = CliqzLanguage.normalizeLocale(localeStr);

    if (locale === '' || locale === undefined || locale === null || locale.length !== 2) return;
    if (url === '' || url === undefined || url === null) return;

    // extract domain from url, hash it and update the value
    const urlHash = CliqzLanguage.hashCode(strip(url, {
      protocol: true,
      www: true,
    }).split('/')[0]) % 256;

    if (!CliqzLanguage.currentState[locale]) {
      CliqzLanguage.currentState[locale] = [];
    }

    if (CliqzLanguage.currentState[locale].indexOf(urlHash) === -1) {
      CliqzLanguage.currentState[locale].push(urlHash);
      console.log(`Saving: ${locale} ${urlHash}`, `${CliqzLanguage.LOG_KEY} for url ${url}`);
      CliqzLanguage.saveCurrentState();
    }
  },
  // do random delete of hash with prob 0.05 (5%)
  removeHash() {
    let changed = false;
    Object.keys(CliqzLanguage.currentState).forEach((lang) => {
      if (CliqzLanguage.currentState[lang].length > (CliqzLanguage.DOMAIN_THRESHOLD + 1)) {
        const prob = Math.random();
        if (prob <= 0.05) {
          const ind = Math.floor(Math.random() * CliqzLanguage.currentState[lang].length);
          if (CliqzLanguage.currentState[lang][ind] !== CliqzLanguage.LOCALE_HASH) {
            if (!changed) changed = !changed;
            console.log(`Removing hash ${CliqzLanguage.currentState[lang][ind]} for the language ${lang}`);
            CliqzLanguage.currentState[lang].splice(ind, 1);
          }
        }
      }
    });
    if (changed) CliqzLanguage.saveCurrentState();
  },
  // returns hash of the string
  hashCode(s) {
    /* eslint-disable no-bitwise */
    return s.split('').reduce((a, b) => {
      const z = ((a << 5) - a) + b.charCodeAt(0);
      return z & z;
    }, 0);
    /* eslint-enable no-bitwise */
  },
  // removes the country from the locale, for instance, de-de => de, en-US => en
  normalizeLocale(str) {
    if (str) return str.split(/-|_/)[0].trim().toLowerCase();
    return str;
  },
  // the function that decided which languages the person understands
  state(exposeWeights = false) {
    let langVec = [];
    Object.keys(CliqzLanguage.currentState).forEach(
      (lang) => {
        const len = Object.keys(CliqzLanguage.currentState[lang]).length;
        if (len > CliqzLanguage.DOMAIN_THRESHOLD) {
          langVec.push([lang, 1.0 / len]);
        }
      }
    );

    langVec = langVec.sort((a, b) => a[1] - b[1]);

    // If `exposeWeights` is true then we return both lang names and weigths
    if (exposeWeights === true) {
      return langVec;
    }

    // returns only lang names
    return langVec.map(l => l[0]);
  },
  // remove doubled values, normalize languages
  cleanCurrentState() {
    const keys = Object.keys(CliqzLanguage.currentState);
    const cleanState = {};
    for (let i = 0; i < keys.length; i += 1) {
      const nkey = CliqzLanguage.normalizeLocale(keys[i]);
      cleanState[nkey] = (cleanState[nkey] || []);

      for (let j = 0; j < CliqzLanguage.currentState[keys[i]].length; j += 1) {
        const value = CliqzLanguage.currentState[keys[i]][j];
        if (cleanState[nkey].indexOf(value) === -1) cleanState[nkey].push(value);
      }
    }

    CliqzLanguage.currentState = { ...cleanState };
    CliqzLanguage.saveCurrentState();
  },

  /*
   ** This returns whitelisted languages in query string form as following **
   * 1. Get top 4 languages from state
   * 2. whitelist them from language list
   * 3. match all possible combinations(pair of 2s) of filtered languages with whitelisted sequence
   * 4. If there is a match return as querystring
   * 5. If no match check if any filtered language is present in sequence set
   * 6. If found, return single language as query string
   */
  stateToQueryString() {
    let sets;
    try {
      sets = JSON.parse(prefs.get('config_language_whitelist', fallbackWhitelist));
    } catch (e) {
      sets = JSON.parse(fallbackWhitelist);
      console.log(`Malformed JSON: ${e}`, CliqzLanguage.LOG_KEY);
    }
    const languages = sets.reduce((acc, entry) => {
      entry.split(',').forEach(l => acc.add(l));
      return acc;
    }, new Set());
    const langs = CliqzLanguage.state().slice(0, 4);
    let filteredString = '';
    const filteredLangs = langs.filter(l => languages.has(l));
    const len = filteredLangs.length;

    if (len > 1) {
      // matches every possible set of two from filtered language
      filteredLangs.every((x) => {
        if (filteredString !== '') return false;
        filteredLangs.every((y) => {
          if (sets.includes(`${x},${y}`)) {
            filteredString = `${x},${y}`;
            return false;
          }
          return true;
        });
        return true;
      });
    }

    // if still no matching set found, looks for allowed single language.
    if (filteredString === '') {
      filteredLangs.every((x) => {
        if (sets.includes(x)) {
          filteredString = x;
          return false;
        }
        return true;
      });
    }

    return filteredString;
  },

  // Save the current state to preferences,
  saveCurrentState() {
    console.log(`Going to save languages: ${JSON.stringify(CliqzLanguage.currentState)}`, CliqzLanguage.LOG_KEY);
    prefs.set('extensions.cliqz-lang.data',
      JSON.stringify(CliqzLanguage.currentState || {}));
    // Updates queryString on any change in state ie. whenever state is saved
    CliqzLanguage.qs = CliqzLanguage.stateToQueryString();
  },

  queryString() {
    let qString = CliqzLanguage.qs;
    // if still we do not have any language fallback to locale
    if (qString === '') {
      qString = CliqzLanguage.getLocale();
    }
    return `&lang=${encodeURIComponent(qString)}`;
  }
};

export default CliqzLanguage;
