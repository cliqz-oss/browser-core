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
    .switchMap(({ query, keyCode, allowEmptyQuery }) =>
      mixResults(query, providers, enricher, config, keyCode, {
        resultOrder: getResultOrder(lastResults),
        allowEmptyQuery,
      })
        // stop updating once user highlighted a result
        .takeUntil(highlight$.do(() => logger.log('Highlight')))
    )
    .let(finalize)
    .do((results) => { lastResults = results; });

  return results$;
}
