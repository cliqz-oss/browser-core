/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parse } from '../core/url';

export default class UrlAnalyzer {
  updatePatterns() {
    // TODO: STUB (get patterns from server)
  }

  parseSearchLinks(url) {
    const pattern = /^https:[/][/][^/]*[.]google[.].*?[#?&;]/;
    if (pattern.test(url)) {
      // Workaround for an encoding issue (source: https://stackoverflow.com/a/24417399/783510).
      // Reason: we want to preserve the original search term. In other words, searches
      // for "abc def" and "abc+def" should be distinguishable. That is why we need to
      // avoid the ambigious '+' character and use explicit white space encoding.
      const url_ = url.replace(/\+/g, '%20');
      const parsedUrl = parse(url_);

      // prefer the original query before spell correction
      const query = parsedUrl.searchParams.get('oq') || parsedUrl.searchParams.get('q');
      if (query) {
        const query_ = encodeURIComponent(query).replace(/%20/g, '+');
        const doublefetchUrl = `https://${parsedUrl.host}/search?q=${query_}`;
        return { found: true, type: 'search-go', query, doublefetchUrl };
      }
    }

    return { found: false };
  }
}
