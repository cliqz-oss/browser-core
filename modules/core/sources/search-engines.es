/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as searchUtils from '../platform/search-engines';
import { fetch } from './http';
import {
  getCleanHost,
  getName,
  isUrlShortener,
  parse,
  tryDecodeURIComponent,
} from './url';

export * from '../platform/search-engines';

export function shouldAppearInDropdown(rawUrl) {
  const url = parse(rawUrl);
  if (url === null) {
    return false;
  }

  const name = getName(url);
  const subdomain = url.domainInfo.subdomain;
  const extra = url.pathname + url.search;

  // Google Filters
  if (
    name === 'google'
    && subdomain !== null
    && subdomain === 'www'
    && (
      extra.indexOf('/search') !== -1 // '/search?' for regular SERPS and '.*/search/.*' for maps
      || extra.startsWith('/url?') // www.google.*/url? - for redirects
      || extra.indexOf('q=') !== -1 // for instant search results
    )
  ) {
    return false;
  }

  // Bing Filters
  // Filter all like:
  //    www.bing.com/search?
  if (name === 'bing' && extra.indexOf('q=') !== -1) {
    return false;
  }

  // Yahoo filters
  // Filter all like:
  //   search.yahoo.com/search
  //   *.search.yahooo.com/search - for international 'de.search.yahoo.com'
  //   r.search.yahoo.com - for redirects 'r.search.yahoo.com'
  if (
    name === 'yahoo'
    && (
      (subdomain === 'search' && url.pathname.startsWith('/search') === 0)
      || (subdomain.endsWith('.search') && url.pathname.startsWith('/search') === 0)
      || (subdomain === 'r.search')
    )
  ) {
    return false;
  }

  // Ignore Cliqz SERP links
  const cleanHost = getCleanHost(url);
  if (
    cleanHost === 'suche.cliqz.com'
    || cleanHost === 'search.cliqz.com'
    || cleanHost === 'suchen.cliqz.com'
    || cleanHost === 'serp.cliqz.com'
  ) {
    return false;
  }

  // Ignore url shorteners
  if (isUrlShortener(url)) {
    return false;
  }

  let searchQuery;
  for (const [param, value] of url.searchParams.params) {
    if (
      param === 'q'
      || param === 'query'
      || param === 'search_query'
      || param === 'field-keywords'
      || param === 'search'
    ) {
      searchQuery = value;
      break;
    }
  }

  if (searchQuery !== undefined) {
    if (searchUtils.getSearchEngines()
      .filter(e => e.urlDetails.host === url.host)
      .map(engine => tryDecodeURIComponent(engine.getSubmissionForQuery(searchQuery)))
      .some(u => rawUrl.indexOf(u) !== -1)
    ) {
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
