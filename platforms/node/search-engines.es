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
  return { name: 'google', url: 'http://www.google.com/search?q=' };
}

export function restoreHiddenSearchEngines() {
}

export function getSearchEngines() {
  return [];
}

export function getEngineByName() {
  return '';
}

export function updateAlias() {}
