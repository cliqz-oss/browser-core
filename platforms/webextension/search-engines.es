/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Defer from '../core/helpers/defer';
import { browser } from './globals';
import { fetch } from '../core/http';
import { parse } from '../core/url';
import console from '../core/console';
import config from '../core/config';
import prefs from '../core/prefs';
import { isAMO, getResourceUrl } from '../core/platform';

const ORIGINAL_SEARCH_ENGINE_NAME = config.settings.DEFAULT_SEARCH_ENGINE
  || (isAMO ? 'Cliqz' : 'Google');

const browserCliqzExists = typeof browser !== 'undefined'
  && Object(browser) === browser
  && Object(browser.cliqz) === browser.cliqz;

const STORAGE_PREFIX = 'search-engines.';
const storage = {
  getItem(key) {
    return prefs.get(`${STORAGE_PREFIX}${key}`);
  },
  setItem(key, value) {
    prefs.set(`${STORAGE_PREFIX}${key}`, value);
  },
  removeItem(key) {
    prefs.clear(`${STORAGE_PREFIX}${key}`);
  },
};

(function migrateFromLocalStorage() {
  if (typeof localStorage === 'undefined') {
    return;
  }
  const localStorageValue = localStorage.getItem('defaultSearchEngine');
  if (typeof localStorageValue === 'string') {
    storage.setItem('defaultSearchEngine', localStorageValue);
    localStorage.removeItem('defaultSearchEngine');
  }
}());

const ENGINE_CODES = [
  'google images',
  'google maps',
  'google',
  'yahoo',
  'bing',
  'wikipedia',
  'amazon',
  'ebay',
  'leo',
  'youtube',
  'ecosia',
];

const getEngineCode = name => ENGINE_CODES.indexOf(name.toLowerCase()) + 1;

function buildSearchEngines(engines = [], isMobile = false) {
  let defaultSearchEngine;
  const nativeEngine = engines.find(e => e.isDefault || e.default);

  if (nativeEngine && (isMobile || browserCliqzExists)) {
    defaultSearchEngine = nativeEngine.name;
  } else {
    defaultSearchEngine = storage.getItem('defaultSearchEngine') || ORIGINAL_SEARCH_ENGINE_NAME;
  }
  return engines
    .map(e => ({
      name: e.name,
      code: getEngineCode(e.name),
      alias: e.alias || '',
      default: e.name === defaultSearchEngine,
      icon: e.icon,
      base_url: e.searchForm || e.search.template,
      urlDetails: parse(e.searchForm || e.search.template),
      getSubmissionForQuery(q, type = 'text/html') {
        const urlObj = e.urls[type];
        // some engines cannot create submissions for all types
        // eg 'application/x-suggestions+json'
        if (!urlObj) {
          return null;
        }

        let queryList = q.split(/\s+/);
        if (queryList.length > 0 && queryList[0].trim() === e.alias) {
          queryList.shift();
        }
        queryList = queryList.join(' ');

        const url = new URL(urlObj.template.replace('{searchTerms}', encodeURIComponent(queryList)));
        const params = new URLSearchParams(url.search);
        (urlObj.params || []).forEach(param =>
          params.set(
            param.name.replace('{searchTerms}', queryList),
            param.value.replace('{searchTerms}', queryList)
          ));
        if (urlObj.params && urlObj.params.length > 0) {
          url.search = params.toString();
        }

        return url.toString();
      },
    }));
}

let SEARCH_ENGINES = [];
const readyDefer = new Defer();
// TODO replace with status?
let enginesLoaded = false;
let enginesLoading = false;

function loadSearchEnginesFromResources() {
  let locale = browser.i18n.getUILanguage().slice(0, 2);
  if (!['en', 'de', 'fr'].includes(locale)) {
    locale = 'en';
  }

  return fetch(getResourceUrl(`webextension-specific/search-engines/${locale}.json`))
    .then(r => r.json())
    .catch(e => console.warn('Could not load search engines.', e));
}

export function loadSearchEngines() {
  if (browserCliqzExists) {
    return browser.cliqz.getSearchEngines()
      .then((engines) => {
        SEARCH_ENGINES = buildSearchEngines(engines, false);
      });
  }

  if (browser.cliqzSearchEngines) {
    return browser.cliqzSearchEngines.getEngines()
      .then((engines) => {
        SEARCH_ENGINES = buildSearchEngines(engines, true);
      });
  }

  if (!enginesLoaded && !enginesLoading) {
    enginesLoading = true;
    loadSearchEnginesFromResources()
      .then((engines) => {
        SEARCH_ENGINES = buildSearchEngines(engines, false);
      })
      .catch(e => console.error('Could not load search engines.', e))
      .finally(() => {
        enginesLoaded = true;
        readyDefer.resolve();
      });
  }

  return readyDefer.promise;
}

export default {};

export function isSearchServiceReady() {
  return loadSearchEngines();
}

export function getDefaultEngine() {
  return {};
}

export function addCustomSearchEngine() {
}

export function removeEngine() {
}

export function getDefaultSearchEngine() {
  return SEARCH_ENGINES.find(engine => engine.default);
}

export function getSearchEngines(blackListed = []) {
  return SEARCH_ENGINES.filter(e => !blackListed.includes(e.name));
}

export function getSearchEnginesAsync(blackListed = []) {
  if (browserCliqzExists) {
    return loadSearchEngines().then(() => getSearchEngines(blackListed));
  }

  return Promise.resolve(getSearchEngines(blackListed));
}

export function getEngineByName(name) {
  return SEARCH_ENGINES.find(engine => engine.name === name);
}

export function setDefaultSearchEngine(name) {
  if (!getEngineByName(name)) {
    return;
  }
  storage.setItem('defaultSearchEngine', name);
  SEARCH_ENGINES.forEach((e) => {
    e.default = e.name === name;
  });

  if (browserCliqzExists) {
    browser.cliqz.setSelectedSearchEngine(name);
  }
}

export function revertToOriginalEngine() {
  setDefaultSearchEngine(ORIGINAL_SEARCH_ENGINE_NAME);
  storage.removeItem('defaultSearchEngine');
}

export function restoreHiddenSearchEngines() {}

export function addEngineWithDetails() {}

export function updateAlias() {}
