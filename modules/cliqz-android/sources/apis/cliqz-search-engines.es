/* globals ChromeUtils, ExtensionAPI */
ChromeUtils.import('resource://gre/modules/Services.jsm');

function toSerializable(engine) {
  const queryPlaceholder = 'XXXXXX';
  const urlTypes = ['text/html', 'application/x-suggestions+json'];
  const serialized = {
    name: engine.name,
    icon: engine.iconURI.spec,
    searchForm: engine.searchForm,
    isCurrent: Services.search.currentEngine === engine,
    urls: {}
  };
  urlTypes.forEach((type) => {
    const submission = engine.getSubmission(queryPlaceholder, type);
    if (submission) {
      serialized.urls[type] = {
        template: submission.uri.spec.replace(queryPlaceholder, '{searchTerms}')
      };
    }
  });
  return serialized;
}

this.cliqzSearchEngines = class extends ExtensionAPI {
  getAPI() {
    return {
      cliqzSearchEngines: {
        getEngines: () => {
          const engines = Services.search.getEngines();
          return engines.map(toSerializable);
        },
        getDefaultEngine: () => toSerializable(Services.search.currentEngine)
      }
    };
  }
};
