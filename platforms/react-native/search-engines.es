import { NativeModules, DeviceEventEmitter } from 'react-native';
import { getDetailsFromUrl } from '../core/url';

const SearchEnginesModule = NativeModules.SearchEnginesModule;
const { locale } = NativeModules.LocaleConstants || { locale: 'en' };

let searchEngines = [];
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

export default {};

export function isSearchServiceReady() {
  return Promise.resolve();
}

export function getDefaultEngine() {
  return {};
}

export function revertToOriginalEngine() {
}

export function addCustomSearchEngine() {
}

const getEngineCode = name => ENGINE_CODES.indexOf(name.toLowerCase()) + 1;

export function getDefaultSearchEngine() {
  return searchEngines.find(engine => engine.default);
}

export async function loadSearchEngines() {
  let engines;

  if (searchEngines.length > 0) {
    return searchEngines;
  }

  if (SearchEnginesModule) {
    engines = await SearchEnginesModule.getSearchEngines();
  } else {
    // TODO: Implement search engines module on android
    engines = [{
      default: true,
      SearchTermComponent: 'XXX',
      LocaleTermComponent: 'XXX',
      name: 'google',
      base_url: 'https://www.google.com/search',
      urls: {
        'text/html': 'https://www.google.com/search?q=XXX',
      }
    }];
  }
  searchEngines = engines.map(e => ({
    name: e.name,
    code: getEngineCode(e.name),
    alias: '', // todo
    default: e.default,
    urlDetails: getDetailsFromUrl(e.base_url),
    getSubmissionForQuery(q, type = 'text/html') {
      const url = e.urls[type];
      // some engines cannot create submissions for all types
      // eg 'application/x-suggestions+json'
      if (!url) {
        return null;
      }

      return url.replace(e.SearchTermComponent, encodeURIComponent(q))
        .replace(e.LocaleTermComponent, locale);
    },
  }));
  return searchEngines;
}

export function setDefaultSearchEngine() {
  // CLIQZ
  searchEngines = [];
  loadSearchEngines();
}

export function getSearchEngines() {
  return searchEngines;
}

export function getSearchEnginesAsync() {
  return Promise.resolve(searchEngines);
}

export function getEngineByName() {
  return '';
}

export function addEngineWithDetails() {
}

export function restoreHiddenSearchEngines() {
}

export function updateAlias() {
}
export function removeEngine() {
}

if (SearchEnginesModule) {
  DeviceEventEmitter.addListener('SearchEngines:SetDefault', () => {
    // GHOSTERY
    searchEngines = [];
    loadSearchEngines();
  });
}
