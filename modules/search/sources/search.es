import logger from './logger';
import Rx from '../platform/lib/rxjs';


// streams
import deepEqual from '../platform/lib/deep-equal';
import handleSession from './mixers/handle-sessions';

// wraps `handleSession` to recursively call `handleSession` if an
// error during processing happens so that search continues to work
const handleSessionWrapper = (query$, highlight$, providers, config) => {
  const results$ = handleSession(query$, highlight$, providers, config);

  return results$
    .catch((error) => {
      // recreate streams ('reset' on error); this is recursive, but invocation
      // is limited by user input (`query$`)
      logger.error('Failed handling queries', error);
      return handleSessionWrapper(query$, highlight$, providers, config);
    });
};


const search = ({ query$, focus$, highlight$ = Rx.Observable.empty() }, providers, config) => {
  const results$ = focus$
    .switchMap(({ event }) => {
      if (event === 'focus') {
        logger.log('Search start (focus)');
        if (config.clearResultsOnSessionStart) {
          return handleSessionWrapper(query$, highlight$, providers, config)
            // clear dropdown when new search starts
            // TODO: where to get `query` object from (see `handle-queries`)?
            // TODO: create (shared) result constructor?
            .startWith({ query: {}, responses: [] });
        }
        return handleSessionWrapper(query$, highlight$, providers, config);
      }
      logger.log('Search end (blur)');
      return Rx.Observable.empty();
    })
    // prevent same final result set from emitting more than once
    // TODO: consider more efficient way to compare
    .distinctUntilChanged(deepEqual)
    .do(results => logger.log('Results', results));

  return results$;
};

export default search;
