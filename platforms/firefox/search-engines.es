Components.utils.import('resource://gre/modules/Services.jsm');

export function setSearchEngine(engine) {
  Services.search.currentEngine = engine;
}

export function getDefaultEngineSuggestionUrl(query) {
  return Services.search.defaultEngine
    .getSubmission(query, 'application/x-suggestions+json').uri.spec;
}
