import utils from '../core/utils';
Components.utils.import('resource://gre/modules/Services.jsm');

export function setSearchEngine(engine) {
  Services.search.currentEngine = engine;
}

export function getDefaultEngineSuggestionUrl(query, searchDataType = 'application/x-suggestions+json') {
  const defaultEngine = utils.getDefaultSearchEngine();
  return defaultEngine.getSubmissionForQuery(query, searchDataType);
}
