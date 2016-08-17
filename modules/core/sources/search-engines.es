Components.utils.import('resource://gre/modules/Services.jsm');

export function setSearchEngine(engine) {
  Services.search.currentEngine = engine;
}
