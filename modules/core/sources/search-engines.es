import * as searchUtils from '../platform/search-engines';
import { cleanMozillaActions, getDetailsFromUrl } from './url';
import { fetch } from './http';

export * from '../platform/search-engines';

function log() {
  // console.log('search-engines', msg);
}


// Filters out results with value:
// 'moz-action:searchengine,{'engineName':'Google','input':'awz','searchQuery':'awz'}'
// that are returned from the unifiedcomplete history provider
// that is the only provider from Firefox 49.0 on
export function isSearchEngineResult(resultValue) {
  const [action] = cleanMozillaActions(resultValue);
  return action === 'searchengine';
}

function getParamValue(params, query) {
  const pairs = query.split('&');
  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i].split('=');
    if (params.indexOf(pair[0]) !== -1) {
      return pair[1];
    }
  }

  return null;
}

// check if a result should be kept in final result list
export function isValidUrl(url) {
  const urlparts = getDetailsFromUrl(url);
  // Google Filters
  if (urlparts.name.toLowerCase() === 'google'
    && urlparts.subdomains.length > 0 && urlparts.subdomains[0].toLowerCase() === 'www'
    && (urlparts.extra.indexOf('/search') !== -1 // '/search?' for regular SERPS and '.*/search/.*' for maps
    || urlparts.extra.indexOf('/url?') === 0 // www.google.*/url? - for redirects
    || urlparts.extra.indexOf('q=') !== -1)) { // for instant search results
    log(`Discarding result page from history: ${url}`);
    return false;
  }
  // Bing Filters
  // Filter all like:
  //    www.bing.com/search?
  if (urlparts.name.toLowerCase() === 'bing' && urlparts.extra.indexOf('q=') !== -1) {
    log(`Discarding result page from history: ${url}`);
    return false;
  }
  // Yahoo filters
  // Filter all like:
  //   search.yahoo.com/search
  //   *.search.yahooo.com/search - for international 'de.search.yahoo.com'
  //   r.search.yahoo.com - for redirects 'r.search.yahoo.com'
  if (urlparts.name.toLowerCase() === 'yahoo'
    && ((urlparts.subdomains.length === 1 && urlparts.subdomains[0].toLowerCase() === 'search' && urlparts.path.indexOf('/search') === 0)
    || (urlparts.subdomains.length === 2 && urlparts.subdomains[1].toLowerCase() === 'search' && urlparts.path.indexOf('/search') === 0)
    || (urlparts.subdomains.length === 2 && urlparts.subdomains[0].toLowerCase() === 'r' && urlparts.subdomains[1].toLowerCase() === 'search'))) {
    log(`Discarding result page from history: ${url}`);
    return false;
  }

  // Ignore Cliqz SERP links
  if (['suche.cliqz.com', 'search.cliqz.com', 'suchen.cliqz.com'].indexOf(urlparts.cleanHost) > -1) {
    log(`Discarding result page from Cliqz SERP: ${url}`);
    return false;
  }

  // Ignore bitly redirections
  if (url.search(/http(s?):\/\/bit\.ly\/.*/i) === 0) {
    log(`Discarding result page from history: ${url}`);
    return false;
  }

  // Ignore Twitter redirections
  if (url.search(/http(s?):\/\/t\.co\/.*/i) === 0) {
    log(`Discarding result page from history: ${url}`);
    return false;
  }

  // Ignore Ebay redirections
  if (url.search(/http(s?):\/\/rover\.ebay\.com\/.*/i) === 0) {
    log(`Discarding result page from history: ${url}`);
    return false;
  }

  const searchQuery = getParamValue(['q', 'query', 'search_query', 'field-keywords', 'search'], urlparts.query);

  if (searchQuery) {
    const searchResultUrls = searchUtils.getSearchEngines()
      .filter(e => e.urlDetails.host === urlparts.host)
      .map(engine => decodeURIComponent(engine.getSubmissionForQuery(searchQuery)));
    if (searchResultUrls.some(u => url.indexOf(u) !== -1)) {
      log(`Discarding result page from history: ${url}`);
      return false;
    }
  }

  return true;
}

export function getEngineByQuery(query) {
  const token = query.trim().split(' ')[0];
  if (!token) {
    return searchUtils.getDefaultSearchEngine();
  }
  const engines = searchUtils.getSearchEngines();
  return engines.find(e => e.alias === token)
    || searchUtils.getDefaultSearchEngine();
}

export function getSearchEngineQuery(engine, query) {
  if (engine && engine.alias) {
    return query.replace(engine.alias, '').trim();
  }
  return query;
}

function defaultSuggestionsHandler(query) {
  const defaultEngine = searchUtils.getDefaultSearchEngine();
  const url = defaultEngine.getSubmissionForQuery(query, 'application/x-suggestions+json');
  if (url) {
    return fetch(url, { credentials: 'omit', cache: 'no-store' }).then(res => res.json());
  }
  return Promise.resolve([query, []]);
}

let suggestionsHandler = defaultSuggestionsHandler;

export function overrideSuggestionsHandler(handler) {
  suggestionsHandler = handler;
}

export function resetSuggestionsHandler() {
  suggestionsHandler = defaultSuggestionsHandler;
}

export function getSuggestions(query) {
  return suggestionsHandler(query);
}
