import Storage from '../core/storage';
import Defer from '../core/helpers/defer';
import { chrome } from './globals';
import { Resource } from '../core/resource-loader';
import { getDetailsFromUrl } from '../core/url';
import console from '../core/console';
import config from '../core/config';

const ORIGINAL_SEARCH_ENGINE_NAME = config.settings.DEFAULT_SEARCH_ENGINE || 'Google';

const storage = new Storage();
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

function buildSearchEngines(engines, isMobile) {
  let defaultSearchEngine;
  if (isMobile) {
    defaultSearchEngine = engines.find(e => e.isCurrent).name;
  } else {
    defaultSearchEngine = storage.getItem('defaultSearchEngine') || ORIGINAL_SEARCH_ENGINE_NAME;
  }
  return engines
    .map(e => ({
      name: e.name,
      code: getEngineCode(e.name),
      alias: '', // todo
      default: e.name === defaultSearchEngine,
      icon: e.icon,
      base_url: e.searchForm || e.search.template,
      urlDetails: getDetailsFromUrl(e.searchForm || e.search.template),
      getSubmissionForQuery(q, type = 'text/html') {
        const urlObj = e.urls[type];
        // some engines cannot create submissions for all types
        // eg 'application/x-suggestions+json'
        if (!urlObj) {
          return null;
        }

        const url = new URL(urlObj.template.replace('{searchTerms}', encodeURIComponent(q)));
        const params = new URLSearchParams(url.search);
        (urlObj.params || []).forEach(param =>
          params.set(
            param.name.replace('{searchTerms}', q),
            param.value.replace('{searchTerms}', q)
          ));
        url.search = params.toString();
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
  let locale = chrome.i18n.getUILanguage().slice(0, 2);
  if (!['en', 'de', 'fr'].includes(locale)) {
    locale = 'en';
  }

  const resource = new Resource(['webextension-specific', 'search-engines', `${locale}.json`], {
    dataType: 'json',
  });

  return resource.load()
    .catch(e => console.warn('Could not load search engines.', e));
}

export function loadSearchEngines() {
  if (chrome.cliqzSearchEngines) {
    return chrome.cliqzSearchEngines.getEngines()
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
}

export function revertToOriginalEngine() {
  setDefaultSearchEngine(ORIGINAL_SEARCH_ENGINE_NAME);
  storage.removeItem('defaultSearchEngine');
}

export function restoreHiddenSearchEngines() {}

export function addEngineWithDetails() {}

export function updateAlias() {}
