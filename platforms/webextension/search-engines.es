import { getDetailsFromUrl } from '../core/url';
import Storage from '../core/storage';

const _ENGINES = [{
  name: 'Cliqz',
  alias: '',
  default: true,
  icon: '',
  searchForm: 'https://search.cliqz.com/#{searchTerms}',
  suggestionUrl: '',
  base_url: 'https://search.cliqz.com/#',
  prefix: '',
  code: 3,
}];

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
  for (const e of getSearchEngines()) {
    if (e.default) {
      return e;
    }
  }
  return undefined;
}


export function getSearchEngines() {
  return _ENGINES.map((e) => {
    // TODO: create the correct search URL
    e.getSubmissionForQuery = q => e.searchForm.replace('{searchTerms}', q);

    // TODO: create the correct search URL
    e.getSuggestionUrlForQuery = q => e.suggestionUrl.replace('{searchTerms}', q);

    e.urlDetails = getDetailsFromUrl(e.searchForm);

    return e;
  });
}

export function getEngineByName(name) {
  return _ENGINES.find(engine => engine.name === name);
}

export function setDefaultSearchEngine(engine) {
  const storage = new Storage();
  storage.setObject('defaultSearchEngine', engine);
}

export function restoreHiddenSearchEngines() {}

export function addEngineWithDetails() {}

export function updateAlias() {}
