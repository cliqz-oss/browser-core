import utils from '../core/utils';

Components.utils.import('resource://gre/modules/Services.jsm');

export function setSearchEngine(engine) {
  Services.search.currentEngine = engine;
}

export function getDefaultEngine() {
  return Services.search.currentEngine;
}

export function revertToOriginalEngine() {
  Services.search.currentEngine = Services.search.originalDefaultEngine;
}

export function getDefaultEngineSuggestionUrl(query, searchDataType = 'application/x-suggestions+json') {
  const defaultEngine = utils.getDefaultSearchEngine();
  return defaultEngine.getSubmissionForQuery(query, searchDataType);
}

export function addCustomSearchEngine(openSearchUrl, makeDefault) {
  Services.search.addEngine(openSearchUrl, null, null, false, {
    onSuccess(engine) {
      if (makeDefault) {
        setSearchEngine(engine);
      }
    }
  });
}
