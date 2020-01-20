/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defer } from 'rxjs';
import { retryWhen, map, take, delay, share } from 'rxjs/operators';
import { fetch as f } from '../../core/http';
import BackendProvider from './backend';
import { getResponse } from '../responses';
import CliqzLanguage from '../../core/language';
import {
  encodeLocale,
  encodePlatform,
  encodeFilter,
  encodeLocation,
  encodeSessionParams,
} from './cliqz-helpers';
import normalize from '../operators/normalize';

export const getRichHeaderQueryString = (q, loc) => [
  `&q=${encodeURIComponent(q)}`,
  encodeSessionParams(),
  CliqzLanguage.queryString(),
  encodeLocale(),
  encodePlatform(),
  encodeFilter(),
  encodeLocation(loc && loc.latitude, loc && loc.longitude)
].join('');

export default class RichHeader extends BackendProvider {
  constructor(settings) {
    super('rich-header');
    this.settings = settings;
  }

  createMessageBody(query, links) {
    return JSON.stringify({
      q: query,
      results: links
        .map(({ extra: snippet, template, url }) => ({
          snippet,
          template,
          url,
        })),
    });
  }

  fetch(query, links) {
    const url = this.settings.RICH_HEADER + getRichHeaderQueryString(query);
    const body = this.createMessageBody(query, links);

    return f(url, { method: 'PUT', body, credentials: 'omit', cache: 'no-store' })
      .then(response => response.json())
      .then(({ results }) => {
        const isIncomplete = results.some(result => result._incomplete);
        if (isIncomplete) {
          return Promise.reject(new Error('incomplete'));
        }
        return results;
      });
  }

  // links is an array of main links from normalized results
  search(query, links, config) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const { retry } = config.providers[this.id];

    return defer(() => this.fetch(query, links))
      .pipe(
        retryWhen(errors => errors
          .pipe(
            delay(retry.delay),
            take(retry.count)
          )),
        map(results => getResponse({
          provider: this.id,
          config,
          query,
          results: this.mapResults({ results, query }).map(normalize),
          state: 'done',
        })),
      ).pipe(share());
  }
}
