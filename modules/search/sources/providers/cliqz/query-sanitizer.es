/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parse } from '../../../core/url';
// List of blocked schemas. All queries of the form "<schema>://<...>"
// will be blocked. Should not contain the special cases "http" and "https".
//
// Note: There are more schemas that we would like to block but which
// do not fit this simple pattern and are harder to detect (e.g., data URIs,
// mailto URIs).
//
const BLACKLISTED_SCHEMAS = [
  'ftp://',
  'file://',
  'irc://',
  'chrome://',
  'resource://',
  'dat://',
];

function isBlacklistedSchema(query) {
  return BLACKLISTED_SCHEMAS.some(x => query.startsWith(x));
}

function tryParseAsUrlWithIncompleteSchema(query) {
  // Relying on the constructor "URL" alone to detect valid URLs is
  // problematic, as it tries very hard to parse any string.
  // For instance, depending on the browser's URL implementation
  // "http://bayern münchen" will be seen as a valid URL, but we do
  // not want to block the query "bayern münchen".
  //
  // In addition, stop guessing if the query is quoted. If it is
  // an exact URL (with "http[s]://"), it has been already handled.
  function hasValidHostname(q) {
    if (/\s/.test(q)) {
      return false;
    }
    const host = q.split('/')[0];
    return !/['"]/.test(host);
  }

  function tryParse(q) {
    if (hasValidHostname(q)) {
      const url = parse(`http://${q}`);
      if (url !== null) {
        return url;
      }
    }
    return undefined;
  }

  let url = tryParse(query);
  if (url) {
    return url;
  }

  // no valid URL, try again but first remove relicts of the
  // schema, for example, if someone is deleting characters
  // from the start of the URL.
  const truncQuery = query.replace(/^['"]?h?t?t?p?s?:?\/\//, '');
  if (truncQuery.length !== query.length) {
    url = tryParse(truncQuery);
    if (url) {
      return url;
    }
  }

  return undefined;
}

/**
 * Warning: This function is very specialized. Do not use it outside
 * this module. It will misclassify shortener links like
 * "http://tinyurl.com/oqnffw3" because the host name is too big.
 *
 * Precondition: query is very small.
 *
 * It is the last safety net to avoid sending URLs from shortener services
 * to the search because they do not exceed the minimum size
 * (e.g., "is.gd/PazNcR", "t.co/RUiFUYKzkz").
 *
 * Note: Again, in human web we can be more conservative at the cost
 * of false positives. For instance, CliqzHumanWeb.isShortenerURL
 * would classify most top queries (e.g., 'amazon', 'finance', 'facebook')
 * as shorteners.
 */
export function _smallQueryButCouldBeUrlShortener(query) {
  const [host, rest] = query.split('/');
  return rest !== undefined && rest.length >= 4
    && host.length <= 7 && host.split('.').length === 2;
}

/**
 * Very crude heuristic to protect against leaking urls.
 *
 * Assumes that real URLs, starting with "http[s]://"
 * have been already filtered. The rough idea is to
 * try whether "http://<query>" is a valid URL and whether
 * it has enough sensitive information to block the search.
 */
function isPotentiallyLeakingUrlInformation(query) {
  // Early exit: If the URL is too small, we can avoid the
  // more expensive checks. This value should be quite conservative,
  // otherwise URL shorter links may slip through
  // (e.g., "goo.gl/bdkh1L", "t.co/RUiFUYKzkz", 'is.gd/PazNcR').
  //
  // Note: URL shorteners in general are a problem, as they provide
  // an extremely compact representation of an URL. Although it is
  // safe to assume that they do not encode URLs with secrets, we
  // would still leak the site that the user is going to visit.
  if (query.length <= 11
      || (query.length <= 18 && !_smallQueryButCouldBeUrlShortener(query))) {
    return false;
  }

  const url = tryParseAsUrlWithIncompleteSchema(query);
  if (!url) {
    // does not look like an URL --> safe
    return false;
  }

  // reject non-public URLs
  if (url.username || url.password || url.port) {
    return true;
  }

  // If the ULR path is non empty, it is a strong indicator
  // that the user is currently typing an URL:
  //
  // * If the path name itself gets too long, we have to careful
  //   because of links from URL shortener (e.g., 'bit.ly/1h0ceQI').
  // * If it contains URL search paramters in addition to the
  //   path ('<domain>/path?param[=key]'), also stop.
  //
  // Note: ".search" without ".pathname" is quite aggressive,
  // for instance, 'Fu?ball' (misspelling for "Fußball"), would
  // already match ("http://Fu?ball" => host: "Fu", search: "ball")
  //
  if (url.pathname !== '/' && (url.pathname.length >= 6 || url.search)) {
    return true;
  }

  const domainGuessable = /\w+[.]\w+\//.test(query);
  if (domainGuessable) {
    return true;
  }

  // looks safe
  return false;
}

export function sanitizeSearchQuery(originalQuery) {
  // fast path, which should handle most calls
  const isSmallEnough = x => x.length <= 6;

  if (isSmallEnough(originalQuery)) {
    return originalQuery;
  }
  if (originalQuery.length > 500) {
    // If the query is extremely large, abort immediately and do
    // not attempt to normalize the query first, which can be a
    // costly operation depending on the size of the text.
    //
    // This limit should be rather conservative, as the real
    // check for huge texts operates on the normalized data.
    // Here, we only want to make sure that the browser does not
    // unnecessarily freeze if you paste a multi MB text file.
    return null;
  }
  const query = originalQuery.replace(/\s+/g, ' ').trim();
  if (isSmallEnough(query)) {
    return originalQuery;
  }

  // Do not attempt to search for long texts. Maybe the user
  // accidentally copied a sensitive email to the clipboard.
  //
  // However, if the limit is too low, we miss valid queries
  // when someone copies error messages and searches for it.
  //
  // Note: In Feb 2018, around 99.9% of searches are less
  // than 100 characters.
  //
  // (TODO: If the text uses a bigger alphabet, we should enforce
  // a stricter limit. Extreme case is Chinese, where a limit
  // of 20-30 character/words could make more sense.)
  //
  if (query.length > 100) {
    return null;
  }

  // http[s] is a special case, but all other specific protocols
  // are potentially dangerous, so immediately exit. Also it is
  // quite unlikely that we would get good search results.
  if (isBlacklistedSchema(query)) {
    return null;
  }


  const exactUrlMatch = query.match(/https?:\/\/.*$/);
  if (exactUrlMatch) {
    // Note: In Feb 2018, 97.6% of the searches did not
    // contain a slash, and 98.68% had less than two.
    // That means, most of the time we will not end here.
    const matchedUrl = exactUrlMatch[0];
    if (query.length <= 10) {
      // Make sure 'http://' and 'https://' will not be rejected.
      // Also if the total query is small enough, there is no need to
      // test further.
      return query;
    }
    const url = parse(matchedUrl);
    if (url === null) {
      // Should be an even rarer case, as almost everything that
      // starts with "http[s]://" is a valid url.
      //
      // Note: The URL API is currently not 100% compatible.
      // For example, "http://a b" is rejected by Firefox and Chrome >= 70,
      // but accepted on all other implementations (might change in the future).
      return null;
    }

    if (url.password || url.username || url.port || url.search || url.pathname !== '/') {
      return null;
    }

    // Rational: For very short queries, the search results may still help
    // and the searches in that case cannot leak too much.
    if (url.host.length <= 6 || (url.host.length <= 12 && url.host.indexOf('.') < 0)) {
      return originalQuery;
    }
    return null;
  }
  if (isPotentiallyLeakingUrlInformation(query)) {
    // This rule is vague, but there is enough evidence that the user
    // is currently editing an URL. Do not query the backend, but
    // instead rely on history information only.
    return null;
  }

  return originalQuery;
}

/**
 * Similar to a normal map but will automatically rotate
 * out the oldest entries once the maximum size is exceeded.
 *
 * (exported for tests)
 */
export class BoundedMap {
  constructor(size) {
    this.map = new Map();
    this.data = [...new Array(size)];
    this.pos = this.data.length - 1;
  }

  set(key, value) {
    const old = this.map.get(key);
    if (old !== undefined) {
      const oldPos = old[1];
      this.data[oldPos] = undefined;
    }

    if (this.data[this.pos] !== undefined) {
      const oldKey = this.data[this.pos];
      this.map.delete(oldKey);
    }

    this.map.set(key, [value, this.pos]);
    this.data[this.pos] = key;
    this.pos = this.pos > 0 ? this.pos - 1 : this.data.length - 1;
  }

  get(key) {
    const entry = this.map.get(key);
    return entry !== undefined ? entry[0] : null;
  }
}

/**
 * Keeps track of previous searches and remembers the last safe
 * searches. In contrast to the "sanitizeSearchQuery" function,
 * which is stateless, it tries to fallback to the longest safe
 * prefix, so the search results do not suddenly vanish.
 *
 * Typical use case: the user starts typing and eventually reaches
 * a state where the search is rejected. The search will then be
 * truncated to the last safe prefix of the current term.
 */
export class QuerySanitizerWithHistory {
  constructor(windowSize = 64) {
    this._knownSafeQueries = new BoundedMap(windowSize);

    // To find safe prefixes, it starts with the current query
    // and successively deletes characters from the end.
    // Increasing this value has the effect that all possible prefixes
    // will be tested, but in practice, this should be rarely needed.
    this._maxAttempts = 10;
  }

  sanitize(query, { rememberSafeQueries = true } = {}) {
    const safeQuery = sanitizeSearchQuery(query) || this._findSafePrefix(query);
    if (safeQuery) {
      if (rememberSafeQueries) {
        this._knownSafeQueries.set(query, safeQuery);
      }
      return safeQuery;
    }
    return null;
  }

  _findSafePrefix(query) {
    const attempts = Math.min(query.length - 1, this._maxAttempts);

    const minSize = query.length - attempts;
    for (let prefixSize = query.length - 1; prefixSize >= minSize; prefixSize -= 1) {
      const prefix = query.substr(0, prefixSize);
      const safeQuery = this._knownSafeQueries.get(prefix);
      if (safeQuery) {
        return safeQuery;
      }
    }
    return null;
  }
}
