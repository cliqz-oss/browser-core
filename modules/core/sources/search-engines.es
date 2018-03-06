import utils from './utils';

export * from '../platform/search-engines';

function log() {
  // utils.log('search-engines', msg);
}

// Filters out results with value:
// 'moz-action:searchengine,{'engineName':'Google','input':'awz','searchQuery':'awz'}'
// that are returned from the unifiedcomplete history provider
// that is the only provider from Firefox 49.0 on
export function isSearchEngineResult(resultValue) {
  const [action] = utils.cleanMozillaActions(resultValue);
  return action === 'searchengine';
}

// check if a result should be kept in final result list
export function isValidUrl(url) {
  const urlparts = utils.getDetailsFromUrl(url);
  // Google Filters
  if (urlparts.name.toLowerCase() === 'google' &&
    urlparts.subdomains.length > 0 && urlparts.subdomains[0].toLowerCase() === 'www' &&
    (urlparts.extra.indexOf('/search') !== -1 || // '/search?' for regular SERPS and '.*/search/.*' for maps
    urlparts.extra.indexOf('/url?') === 0 || // www.google.*/url? - for redirects
    urlparts.extra.indexOf('q=') !== -1)) { // for instant search results
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
  if (urlparts.name.toLowerCase() === 'yahoo' &&
    ((urlparts.subdomains.length === 1 && urlparts.subdomains[0].toLowerCase() === 'search' && urlparts.path.indexOf('/search') === 0) ||
    (urlparts.subdomains.length === 2 && urlparts.subdomains[1].toLowerCase() === 'search' && urlparts.path.indexOf('/search') === 0) ||
    (urlparts.subdomains.length === 2 && urlparts.subdomains[0].toLowerCase() === 'r' && urlparts.subdomains[1].toLowerCase() === 'search'))) {
    log(`Discarding result page from history: ${url}`);
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

  return true;
}
