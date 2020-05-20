/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';

import { strip, haveCompatibleProtocol, isUrl } from '../../../core/url';

const isAd = l => l.extra && l.extra.is_ad;

/**
 * For query completion we do not want to fully trim inputs as trailing space
 * are important and need to be kept. This small helper only trims leading
 * spaces. This allows to complete something like ' exam' to ' example.com'.
 */
function ltrim(str) {
  let start = 0;
  while (str.charCodeAt(start) <= 32) {
    start += 1;
  }
  return start === 0 ? str : str.slice(start);
}

export function getCompletion(query, link, options) {
  if (isAd(link)) {
    return '';
  }

  const { url, title } = link;

  if (!query || !url) {
    return '';
  }

  const strippedUrl = strip(ltrim(url), {
    spaces: false,
    protocol: true,
    www: true,
    mobile: true,
    trailingSlash: true,
  });

  const strippedQuery = strip(ltrim(query), {
    spaces: false,
    protocol: true,
    www: true,
    mobile: true,
  });

  // in case a typed query fully matches the url, we do not consider it
  // an autocompletable, so instant result will be shown and if used will
  // not be counted as provided by Cliqz
  if (
    (url === query)
    || (url === strippedQuery)
    || (strippedUrl === query)
    || (strippedUrl === strippedQuery)
  ) {
    return '';
  }

  // Make sure that completions are case-insensitive.
  const lowerQuery = query.toLowerCase();

  // We only allow completion based on stripped query (without protocol, etc.)
  // if the protocol of `url` and `query` are "compatible". This means that we
  // will not allow `about:` query with `https:` URL. On the other hand we want
  // to complete 'http:' query with 'https:' URL. Note that if either `query` or
  // `url` does not have a protocol, then we consider the protocol to be
  // "compatible".
  //
  // Check the `haveCompatibleProtocol(...)` documentation for more details
  // about what compatibility means in details.
  //
  // Additionally, if stripped query is empty, it does not make sense to
  // complete anything. Otherwise we will be completing queries like 'http:'
  // with *any* URL.
  if (strippedQuery.length !== 0 && haveCompatibleProtocol(url, query)) {
    const lowerStrippedQuery = strippedQuery.toLowerCase();
    const lowerStrippedUrl = strippedUrl.toLowerCase();

    if (lowerStrippedUrl.startsWith(lowerQuery)) {
      return strippedUrl.substring(query.length);
    }

    if (lowerStrippedUrl.startsWith(lowerStrippedQuery)) {
      return strippedUrl.substring(strippedQuery.length);
    }
  }

  // EXPERIMENT: in case we did not find a completion based on query + url
  // (stripped or not) we optionally try to find one based on the title of the
  // result. This is intended to handle cases like query "hacker n" which is
  // expected to complete to "hacker news — news.ycombinator.com" (here the
  // domain does not match the query but it's nice to still complete). To not
  // spend too much effort on this until we know if we'd like to keep this
  // feature we currently "abuse" the `completion` result to also add the url
  // separated with ' — ' so that it looks nicer in the dropdown. Ideally it
  // should be handled differently by dropdown. There is some equally hacky
  // logic in 'modules/dropdown/sources/managers/base.es' to make sure some
  // interactions like pressing arrows behave nicely.
  if (
    title
    && options
    && options.useTitle
    && title.toLowerCase().startsWith(lowerQuery)
    && !isUrl(lowerQuery)
  ) {
    return `${title.substring(query.length)} — ${link.friendlyUrl || url}`;
  }

  return '';
}

export default config => pipe(map((result) => {
  const options = config.operators.addCompletion;

  return {
    ...result,
    // TODO: handle other parts of the response (like providers)
    responses: result.responses.map(response => ({
      ...response,
      results: response.results.map(r => ({
        // TODO: handle other parts of the result (what is there?)
        links: r.links.map((l) => {
          if (options.providerBlacklist.indexOf(l.provider) >= 0) {
            return l;
          }

          return {
            ...l,
            meta: {
              ...l.meta,
              completion: getCompletion(result.query.query, l, options),
            }
          };
        }),
      })),
    }))
  };
}));
