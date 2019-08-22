/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { empty } from 'rxjs';
import { tap, switchMap, catchError, startWith } from 'rxjs/operators';
import logger from './logger';
// streams
import handleSession from './mixers/handle-sessions';

// wraps `handleSession` to recursively call `handleSession` if an
// error during processing happens so that search continues to work
const handleSessionWrapper = (query$, highlight$, providers, config) => {
  const results$ = handleSession(query$, highlight$, providers, config);

  return results$.pipe(
    catchError((error) => {
      // recreate streams ('reset' on error); this is recursive, but invocation
      // is limited by user input (`query$`)
      logger.error('Failed handling queries', error);
      return handleSessionWrapper(query$, highlight$, providers, config);
    })
  );
};

const search = ({ query$, focus$, highlight$ = empty() }, providers, config) => {
  const results$ = focus$
    .pipe(
      switchMap(({ event }) => {
        if (event === 'focus') {
          logger.log('Search start (focus)');
          if (config.clearResultsOnSessionStart) {
            return handleSessionWrapper(query$, highlight$, providers, config)
              // clear dropdown when new search starts
              // TODO: where to get `query` object from (see `handle-queries`)?
              // TODO: create (shared) result constructor?
              .pipe(startWith({ query: {}, responses: [] }));
          }
          return handleSessionWrapper(query$, highlight$, providers, config);
        }
        logger.log('Search end (blur)');
        return empty();
      }),
      // prevent same final result set from emitting more than once
      // TODO: consider more efficient way to compare
      tap(results => logger.log('Results', results))
    );
  return results$;
};

export default search;
