/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { isUrl, fixURL } from '../../core/url';
import {
  getEngineByQuery,
  getSearchEngineQuery,
  loadSearchEngines,
} from '../../core/search-engines';
import BaseProvider from './base';
import { PROVIDER_INSTANT } from '../consts';
import normalize from '../operators/normalize';

function getKind(query) {
  const source = 'default-search';

  const engine = getEngineByQuery(query);
  if (!engine && !engine.name) {
    return [source];
  }

  const name = engine.name;

  // To implement `kind` conventions: the source ('default-search') is followed
  // by a stringified object having a key 'class' that contains (in this context)
  // the search engine's name; they are separated by '|'. For example:
  //    'default-search|{"class":"Google"}'
  // Doing this allows us to reuse existing telemetry pipelines.
  return [`${source}|${JSON.stringify({ class: name })}`];
}

export default class InstantProvider extends BaseProvider {
  constructor() {
    super(PROVIDER_INSTANT);
  }

  search(query = '', config) {
    if (!query || !config.providers[this.id].isEnabled) {
      return this.getEmptySearch(config);
    }

    const isQueryUrl = isUrl(query);

    return this.getResultsFromPromise(
      loadSearchEngines().then(() => {
        const results = [];

        if (isQueryUrl) {
          const url = fixURL(query);

          if (url !== null) {
            results.push(normalize({
              provider: this.id,
              type: 'navigate-to',
              url,
              friendlyUrl: url,
              text: query,
              data: {
                kind: ['navigate-to'],
              },
            }));
          }
        }

        if (!config.settings['search.config.providers.complementarySearch.disabled']) {
          const engine = getEngineByQuery(query);
          if (engine) {
            const rawQuery = getSearchEngineQuery(engine, query);
            results.push(normalize({
              provider: this.id,
              type: 'supplementary-search',
              url: engine.getSubmissionForQuery(rawQuery),
              text: rawQuery,
              data: {
                kind: getKind(query),
                suggestion: query,
                extra: {
                  searchEngineName: engine.name,
                },
              },
            }));
          }
        }

        return results;
      }),
      query,
      config,
    );
  }
}
