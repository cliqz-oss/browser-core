/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as searchUtils from '../../core/search-engines';

import normalize from '../operators/normalize';
import { PREVENT_AUTOCOMPLETE_KEYS } from '../consts';

import BaseProvider from './base';

export default class QuerySuggestionProvider extends BaseProvider {
  constructor() {
    super('querySuggestions');
  }

  suggestionsNotAllowed(query, params) {
    // We are not requesting query suggestion for url-like queries
    // (like starting with "htt"), pasted or corrected queries.
    // This is what Mozilla does in Firefox so should we.
    return (
      !query
      || query.trim().startsWith('htt')
      || params.isPasted
      || PREVENT_AUTOCOMPLETE_KEYS.includes(params.keyCode)
    );
  }

  search(query, config, params) {
    if (!config.providers[this.id].isEnabled || this.suggestionsNotAllowed(query, params)) {
      return this.getEmptySearch(config, query);
    }

    const engine = searchUtils.getDefaultSearchEngine();
    return this.getResultsFromPromise(
      searchUtils.getSuggestions(query).then(([q, suggestions]) =>
        suggestions
          .filter(suggestion => suggestion !== query)
          .map(suggestion =>
            normalize({
              query: q,
              url: engine.getSubmissionForQuery(suggestion),
              text: suggestion,
              data: {
                suggestion,
                kind: ['Z'],
                extra: {
                  searchEngineName: engine.name,
                },
              },
              type: 'supplementary-search',
            }))),
      query,
      config,
    );
  }
}
