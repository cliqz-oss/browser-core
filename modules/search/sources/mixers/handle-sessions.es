import Enricher from '../operators/enricher';
import logger from '../logger';
import mixResults from '../mixers/mix-results';

import { getResultOrder } from '../operators/results/utils';
import finalize from '../operators/streams/finalize';

/*
 * Takes a query stream, creates a (mixed) result stream for each query.
 * Stop updating if user highlighted a result.
 */
export default function handleSessions(query$, highlight$, providers, config) {
  const enricher = new Enricher();

  // TODO: create session ID here

  let lastResult = {};

  const results$ = query$
    .do(({ query }) => logger.log(`Query '${query}'`))
    .switchMap(({ query, ...params }) =>
      mixResults({
        query,
        ...params,
        resultOrder: getResultOrder(lastResult),
      }, providers, enricher, config)
        // stop updating once user highlighted a result
        .takeUntil(highlight$.do(() => logger.log('Highlight'))))
    .let(finalize(config))
    // TODO: verify that first response always exist (check `merge-results`)
    .do((result) => { lastResult = result; });

  return results$;
}
