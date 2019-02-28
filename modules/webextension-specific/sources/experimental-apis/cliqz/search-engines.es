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

const searchServiceGlobalPromise = new Promise((onFulfill, onReject) => {
  searchService.init({
    onInitComplete: (initStatus) => {
      if (initStatus === 0) {
        onFulfill();
      } else {
        onReject();
      }
    }
  });
});

export async function getSearchEngines() {
  return searchServiceGlobalPromise.then(() => {
    const defaultEngine = searchService.getDefaultEngineInfo();

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
  }, () => {
    throw new Error('Reason: SearchService has not been initialized');
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
