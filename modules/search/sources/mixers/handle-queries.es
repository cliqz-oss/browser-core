import Enricher from '../operators/enricher';
import logger from '../logger';
import mixResults from '../mixers/mix-results';

import { getResultOrder } from '../operators/results/utils';
import finalize from '../operators/responses/finalize';

/*
 * Takes a query stream, creates a (mixed) result stream for each query.
 * Stop updating if user highlighted a result.
 */
export default function handleQueries(query$, highlight$, providers, config) {
  const enricher = new Enricher();

  let lastResults = [];

  const results$ = query$
    .do(({ query }) => logger.log(`Query '${query}'`))
    .switchMap(({ query, ...params }) =>
      mixResults({
        query,
        ...params,
        resultOrder: getResultOrder(lastResults),
        // to allow 'merge' to pick the newest response (after smoothing)
        ts: Date.now(),
      }, providers, enricher, config)
        // stop updating once user highlighted a result
        .takeUntil(highlight$.do(() => logger.log('Highlight')))
    )
    .let(obs$ => finalize(obs$, config))
    .do((results) => { lastResults = results; });

  return results$;
}
