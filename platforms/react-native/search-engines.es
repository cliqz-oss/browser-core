import { getDetailsFromUrl } from '../core/url';

const defaultSearchEngine = {
  name: 'DuckDuckGo',
  url: 'https://duckduckgo.com/?q=',
  default: true,
  getSubmissionForQuery: query => defaultSearchEngine.url + query,
  get urlDetails() { return getDetailsFromUrl(defaultSearchEngine.url); }
};

export default {};

export function setSearchEngine() {
}

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

export function getDefaultSearchEngine() {
  return defaultSearchEngine;
}

export function setDefaultSearchEngine({ name, url }) {
  defaultSearchEngine.name = name;
  defaultSearchEngine.url = url;
}

export function getSearchEngines() {
  return [defaultSearchEngine];
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
