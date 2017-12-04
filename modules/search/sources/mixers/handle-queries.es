import logger from '../logger';

// operators
import apply from '../operators/apply';
import decrease from '../operators/decrease';
import Enricher from '../operators/enricher';
import limit from '../operators/limit';
import merge from '../operators/merge';
import reconstruct from '../operators/reconstruct';
import update from '../operators/update';
import trim from '../operators/trim';

// streams
import mixResults from '../mixers/mix-results';

// TODO: need some naming convention to distinguish streams from other variables
/*
 * Takes a query stream, creates a (mixed) result stream for each query, and
 * "smoothes" result sets over time using partial updates (by provider).
 */
const handleQueries = (query$, providers, config) => {
  const enricher = new Enricher();

  const currentResults$ = query$
    .do(query => logger.log(`Query '${query}'`))
    .switchMap(query => mixResults(query, providers, enricher, config))
    .share();

  // TODO: rename, it's more like the latest responses with results (per provider)
  const bestResults$ = currentResults$
    .scan((current, incoming) => current
      .map((cur, i) => {
        const next = incoming[i];
        if (next.state === 'pending' && next.results.length === 0) {
          return cur;
        }
        return next;
      })
    );

  const previousResults$ = query$
    .withLatestFrom(bestResults$)
    .map(([, results]) => results)
    .startWith([]);

  const updatedResults$ = currentResults$
    .withLatestFrom(previousResults$)
    .map(update);

  return updatedResults$
    .map(responses => responses.map(limit))
    .map(merge)
    .map(decrease)
    .map(trim)
    .map(response => apply(response, reconstruct))
    .pluck('results');
};

export default handleQueries;
