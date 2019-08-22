/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// import utils from '../core/utils';
import _hash from '../core/helpers/hash';
import NEWS_DOMAINS from '../freshtab/news-domains';
import config from '../core/config';
import { promiseHttpHandler } from '../core/http';

export default class RichHeaderProxy {
  constructor(settings) {
    this.newsCache = Object.create(null);
    this.settings = settings;
  }

  getNews(domainName) {
    let domain = domainName;
    if (domain.indexOf('www.') === 0) {
      domain = domain.substring(4, domain.length);
    }

    const hash = _hash(domain);

    // TODO - is this still in use?
    // const richHeaderUrl = (
    //   this.settings.RICH_HEADER
    //   + utils.getRichHeaderQueryString(`[${hash}]`)
    // );
    const richHeaderUrl = this.settings.RICH_HEADER;

    if (!(hash in NEWS_DOMAINS)) {
      return Promise.resolve(null);
    }

    if (domain in this.newsCache) {
      return Promise.resolve(this.newsCache[domain]);
    }

    return promiseHttpHandler('PUT', richHeaderUrl, JSON.stringify({
      q: `[${hash}]`,
      results: [
        {
          url: config.settings.HB_NEWS,
          snippet: {},
        },
      ],
    }), 2000).then((response) => {
      const payload = JSON.parse(response.response);
      const news = payload.results[0].news[domain];

      this.newsCache[domain] = news;

      return news;
    }, () => {});
  }
}
