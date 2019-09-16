/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { from, empty, combineLatest } from 'rxjs';
import { flatMap, share, catchError, tap } from 'rxjs/operators';
import inject from '../../core/kord/inject';
import { getMainLink } from '../operators/normalize';
import logger from '../logger';

const contextSearchModule = inject.module('context-search');

const expandQuery = query => contextSearchModule.action('expandQuery', query);

// map to structure expected by context-search
const mapResults = (response, source) => response.results
  .map((result, index) => {
    const main = getMainLink(result);
    return {
      url: main.url,
      score: main.meta.score,
      // add index and source for later re-assembly
      index,
      source,
    };
  });

export default class ContextSearch {
  /*
   * If enabled, expands query, performs a second search with the expanded query
   * using the given provider, and merges the expanded results with the original
   * results.
   *
   * @param {String} query - The query.
   * @param {Object} provider - The provider.
   * @param {Observable} results$ - The original results.
   * @param {Object} config - The configuration.
   * @return {Observable}
   */
  search(provider, results$, query, config, params) {
    const { isEnabled } = config.mixers['context-search'];

    if (!isEnabled) {
      return results$;
    }

    return from(expandQuery(query)).pipe(
      expansion$ => this.mix(expansion$, provider, results$, query, config, params)
    );
  }

  mix(expansion$, provider, results$, query, config, params) {
    return expansion$
      .pipe(
        flatMap((expansion) => {
        // if no expansion: don't query backend again, just return results
          if (!expansion) {
            return results$;
          }
          return provider.search(expansion, config, params)
            .pipe(
              tap(() => logger.debug('Context-Search', { expansion })),
              expandedResults$ => combineLatest(expandedResults$, results$),
              flatMap(this.mergeResults),
            );
        }),
        catchError((error) => {
          logger.log('Context-Search error', { error });
          // ignore error and return results (without context-search)
          return results$;
        }),
        share()
      );
  }

  mergeResults([expanded, original]) {
    // do not merge if one of the responses is not done yet
    if (expanded.state !== 'done' || original.state !== 'done') {
      return empty();
    }

    return from(contextSearchModule
      .action('mergeResults',
        mapResults(expanded, 'expanded'),
        mapResults(original, 'original'))
      .then(mergedResults => ({
        ...original,
        results: mergedResults
          .map(({ index, source }) => {
            if (source === 'expanded') {
              return {
                ...expanded.results[index],
                meta: {
                  'context-search': true,
                }
              };
            }
            return original.results[index];
          })
      })));
  }
}
