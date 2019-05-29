/* global Components */
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm', {}); // eslint-disable-line no-undef
const searchService = Services.search;

function getUriForType(type, engineWrapper) {
  const uriWrapper = engineWrapper.getSubmission('{searchTerms}', type);

  if (!uriWrapper) {
    return null;
  }

  const uri = uriWrapper.uri;
  const response = {
    method: 'GET',
    template: `${decodeURIComponent(uri.spec)}`,
    params: []
  };

  return response;
}

function buildUrls(engineWrapper) {
  const urls = {};

  // Commonly used two types;
  // text/html
  // application/x-suggestions+json
  const textHtmlType = 'text/html';
  const xJsonType = 'application/x-suggestions+json';

  const textHtmlTypeUri = getUriForType(textHtmlType, engineWrapper);
  const xJsonTypeUri = getUriForType(xJsonType, engineWrapper);

  if (textHtmlTypeUri !== null) {
    urls[textHtmlType] = textHtmlTypeUri;
  }

  if (xJsonTypeUri !== null) {
    urls[xJsonType] = xJsonTypeUri;
  }

  return urls;
}

const searchServiceGlobalPromise = new Promise((resolve) => {
  const isPromised = searchService.init(resolve);

  // from Fx67 the init function returns a promise
  if (isPromised) isPromised.then(resolve);
});

export async function getSearchEngines() {
  return searchServiceGlobalPromise.then(() => {
    const defaultEngine = searchService.getDefaultEngineInfo();
    const visibleEngines = searchService.getVisibleEngines();

    if (visibleEngines.length > 0) {
      return searchService.getVisibleEngines().map((engineWrapper) => {
        const engine = {
          alias: engineWrapper.alias,
          default: engineWrapper.name === defaultEngine.name,
          description: engineWrapper.description,
          encoding: 'UTF-8',
          icon: engineWrapper.iconURI.spec,
          identifier: engineWrapper.identifier,
          name: engineWrapper.name,
          searchForm: engineWrapper.searchForm,
          urls: buildUrls(engineWrapper)
        };
        return engine;
      });
    }

    // TODO: the shape of visibleEngines seems to be changed in Fx67 but
    //       even the Firefox tests are not updated to the right version yet
    //
    // !!!!  to be updated before this goes live
    Services.console.logStringMessage('getSearchEngines failed');

    // we return a dummy engine for now
    return [{
      alias: '',
      default: true,
      description: 'Cliqz Search',
      encoding: 'UTF-8',
      icon: '',
      identifier: 'Cliqz',
      name: 'Cliqz',
      searchForm: 'https://suchen.cliqz.com/',
      urls: { 'text/html': {
        method: 'GET',
        template: decodeURIComponent('https://suchen.cliqz.com/#{searchTerms}'),
        params: []
      } }
    }];
  });
}

export async function setSelectedSearchEngine(nextSearchEngineName) {
  return searchServiceGlobalPromise.then(() => {
    const nextEngine = searchService.getEngineByName(nextSearchEngineName);
    if (!nextEngine) {
      return -1;
    }

    searchService.defaultEngine = nextEngine;
    return 0;
  }, () => {
    throw new Error('Reason: SearchService has not been initialized');
  });
}
