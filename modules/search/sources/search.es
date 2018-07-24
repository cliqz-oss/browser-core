import logger from './logger';
import Rx from '../platform/lib/rxjs';


// streams
import deepEqual from '../platform/lib/deep-equal';
import handleQueries from './mixers/handle-queries';

// data structure:
//
// response = {
//   provider: 'ID',
//   state: 'STATE',
//   results: [
//     {
//       links: [
//         {
//           url: 'URL',
//           // title, ...
//           meta: {
//             type: 'TYPE',
//             // ...
//           }
//         },
//         // more links...
//       ]
//     },
//     // more results...
//   ]
// }

// wraps `handleQueries` to recursively call `handleQueries` if an
// error during processing happens so that search continues to work
const handleQueriesWrapper = (query$, highlight$, providers, config) => {
  const results$ = handleQueries(query$, highlight$, providers, config);

  return results$
    .catch((error) => {
      // recreate streams ('reset' on error); this is recursive, but invocation
      // is limited by user input (`query$`)
      logger.error('Failed handling queries', error);
      return handleQueriesWrapper(query$, highlight$, providers, config);
    });
};


const search = ({ query$, focus$, highlight$ = Rx.Observable.empty() }, providers, config) => {
  const results$ = focus$
    .switchMap(({ event }) => {
      if (event === 'focus') {
        logger.log('Search start (focus)');
        if (config.clearResultsOnSessionStart) {
          return handleQueriesWrapper(query$, highlight$, providers, config)
            // clear dropdown when new search starts
            .startWith([]);
        }
        return handleQueriesWrapper(query$, highlight$, providers, config);
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
