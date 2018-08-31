import { Components, Services } from './globals';
import { getDetailsFromUrl } from '../core/url';
import Defer from '../core/helpers/defer';

Components.utils.import('resource://gre/modules/Services.jsm');

const SEARCH_ENGINE_TOPIC = 'browser-search-engine-modified';
const readyDefer = new Defer();
let initializing = false;
const ENGINE_CODES = [
  'google images',
  'google maps',
  'google',
  'yahoo',
  'bing',
  'wikipedia',
  'amazon',
  'ebay',
  'leo',
  'youtube',
  'ecosia'
];
const getEngineCode = name => ENGINE_CODES.indexOf(name.toLowerCase()) + 1;
let ENGINE_CACHE = null;

export function setSearchEngine(engine) {
  Services.search.currentEngine = engine;
}

export function getSearchEngines(blackListed = []) {
  if (ENGINE_CACHE === null) {
    const defaultEngine = Services.search.defaultEngine;
    ENGINE_CACHE = Services.search.getEngines()
      .filter(e => !e.hidden && e.iconURI != null)
      .map(e => ({
        name: e.name,
        code: getEngineCode(e.name),
        alias: e.alias,
        default: e === defaultEngine,
        icon: e.iconURI.spec,
        base_url: e.searchForm,
        urlDetails: getDetailsFromUrl(e.searchForm),
        getSubmissionForQuery(q, type) {
          // 'keyword' is used by one of the Mozilla probes
          // to measure source for search actions
          // https://dxr.mozilla.org/mozilla-central/rev/e4107773cffb1baefd5446666fce22c4d6eb0517/browser/locales/searchplugins/google.xml#15
          const submission = e.getSubmission(q, type, 'keyword');

          // some engines cannot create submissions for all types
          // eg 'application/x-suggestions+json'
          if (submission) {
            return submission.uri.spec;
          }
          return null;
        }
      }));
  }

  return ENGINE_CACHE.filter(e => !blackListed.includes(e.name));
}

export function loadSearchEngines() { return Promise.resolve(); }

export function getDefaultSearchEngine() {
  const searchEngines = getSearchEngines();
  return searchEngines.filter(se => se.default)[0];
}

export function getDefaultEngine() {
  return Services.search.currentEngine;
}

export function getEngineByName(name) {
  return getSearchEngines().find(engine => engine.name === name);
}

/*
    We want to remove the search engine in order to update it by addEngineWithDetails function
    If the search engines are stored in user profile, we can remove them
  */
export function removeEngine(name) {
  let engine = Services.search.getEngineByName(name);
  if (engine) {
    Services.search.removeEngine(engine);
  }
  // Check if the engine has been removed or not
  engine = Services.search.getEngineByName(name);
  // If not, search engines cannot be removed since they are stored in global location
  // removeEngine will just hide the engine, we can restore it by unhiding it
  if (engine) {
    engine.hidden = false;
  }
}

export function revertToOriginalEngine() {
  Services.search.currentEngine = Services.search.originalDefaultEngine;
}

export function isSearchServiceReady() {
  if (!initializing) {
    initializing = true;
    const observer = {
      observe() {
        ENGINE_CACHE = null;
        getSearchEngines();
      }
    };

    Services.obs.addObserver(observer, SEARCH_ENGINE_TOPIC, false);
    isSearchServiceReady.unload = () => {
      Services.obs.removeObserver(observer, SEARCH_ENGINE_TOPIC);
    };

    Services.search.init(readyDefer.resolve);
  }

  return readyDefer.promise;
}

export function addEngineWithDetails(engine) {
  return isSearchServiceReady().then(() => {
    const existedEngine = Services.search.getEngineByName(engine.name);
    if (existedEngine) {
      // Update the engine alias in case it has been removed
      if (!existedEngine.alias) {
        existedEngine.alias = engine.key;
      }

      return;
    }

    Services.search.addEngineWithDetails(
      engine.name,
      engine.iconURL,
      engine.key,
      engine.name,
      engine.method,
      engine.url
    );
    if (engine.encoding) {
      Services.search.getEngineByName(engine.name)
        .wrappedJSObject._queryCharset = engine.encoding;
    }
  });
}

export function restoreHiddenSearchEngines() {
  // YouTube - special case
  const SEARCH_ENGINE_ALIAS = {
    youtube: '#yt',
    'youtube-de': '#yt',
  };
  isSearchServiceReady().then(() => {
    Services.search.getEngines().forEach((e) => {
      if (e.hidden === true) {
        e.hidden = false;
        // Restore the alias as well
        if (!e.alias && e.identifier) {
          if (SEARCH_ENGINE_ALIAS[e.identifier]) {
            e.alias = SEARCH_ENGINE_ALIAS[e.identifier];
          } else {
            e.alias = `#${e.identifier.toLowerCase().substring(0, 2)}`;
          }
        }
      }
    });
  });
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

export function updateAlias(name, newAlias) {
  isSearchServiceReady().then(() => {
    Services.search.getEngineByName(name).alias = newAlias;
  });
}

export function setDefaultSearchEngine(name) {
  const engine = getEngineByName(name);
  setSearchEngine(engine);
}
