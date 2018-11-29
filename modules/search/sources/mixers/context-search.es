import Rx from '../../platform/lib/rxjs';
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

const mergeResults = ([expanded, original]) => {
  // do not merge if one of the responses is not done yet
  if (expanded.state !== 'done' || original.state !== 'done') {
    return Rx.Observable.empty();
  }

  return Rx.Observable.fromPromise(contextSearchModule
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
};

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
export default function contextSearch(provider, results$, query, config, params) {
  const { isEnabled } = config.mixers['context-search'];

  if (!isEnabled) {
    return results$;
  }

  return Rx.Observable
    .fromPromise(expandQuery(query))
    .flatMap((expansion) => {
      // if no expansion: don't query backend again, just return results
      if (!expansion) {
        return results$;
      }
      return provider.search(expansion, config, params)
        .do(() => logger.debug('Context-Search', { expansion }))
        .combineLatest(results$)
        .flatMap(mergeResults);
    })
    .catch((error) => {
      logger.log('Context-Search error', { error });
      // ignore error and return results (without context-search)
      return results$;
    })
    .share();
}
