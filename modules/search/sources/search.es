import logger from './logger';
import Rx from '../platform/lib/rxjs';


// streams
import handleQueries from './mixers/handle-queries';
import deepEqual from '../platform/lib/deep-equal';

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
const handleQueriesWrapper = (query$, providers, config) =>
  handleQueries(query$, providers, config).catch((error) => {
    // recreate streams ('reset' on error); this is recursive, but invocation
    // is limited by user input (`query$`)
    logger.error('Failed handling queries', error);
    return handleQueriesWrapper(query$, providers, config);
  });


const createResultStream = (query$, focus$, providers, config) => {
  const results$ = focus$
    .switchMap((event) => {
      if (event === 'focus') {
        logger.log('Search start (focus)');
        return handleQueriesWrapper(query$, providers, config);
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

export default createResultStream;
