/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { filter, first, scan, switchMap, startWith, map, withLatestFrom } from 'rxjs/operators';
import integersToHistogram from '../core/helpers/histogram';

const telemetryLatency = (focus$, query$, results$) => {
  // collect all results during one search session
  const allResults$ = focus$
    .pipe(
      // 'focus' marks start of a search session
      filter(({ event }) => event === 'focus'),
      switchMap(() => query$
        .pipe(
          // ensure that only results are reported once per query by only
          // letting through the first result list that contains some cliqz
          // results
          switchMap(({ query }) => results$
            .pipe(
              filter(results => results.some(({ provider, text }) =>
                // need to check for query because of smoothing: there might be
                // cliqz results for a new query, but these results may still be
                // from the previous query
                text === query && provider === 'cliqz')),
              first()
            )),
          // clear on new search session
          startWith([]),
          // collect all results
          scan((acc, cur) => [...acc, cur])
        ))
    );

  const latency$ = focus$
    .pipe(
      // 'blur' marks end of a search session
      filter(({ event }) => event === 'blur'),
      // get latest list of results
      withLatestFrom(allResults$),
      // only care about results, not the blur event
      map(([, allResults]) => allResults),
      map(allResults => allResults.map(
        results => results
          // only cliqz results contain latency information
          .filter(({ provider }) => provider === 'cliqz')
          // extract latency
          .map(({ meta: { latency, backendCountry } = {} }) => ({ latency, backendCountry }))
          // only take one latency value (they are the same for all cliqz
          // results of the same query since we only make one call to the
          // backend per query)
          .reduce((acc, cur) => cur)
      )),
      // no latencies => nothing to report
      filter(latencies => latencies.length > 0),
      // build histograms
      map((latencies) => {
        // all data elements have the same backend country
        const backend = latencies[0].backendCountry;

        const smallLatencies = latencies.reduce((acc, { latency }) =>
          [...acc, ...latency < 200 ? [latency] : []], []);
        const bigLatencies = latencies.reduce((acc, { latency }) =>
          [...acc, ...latency >= 200 ? [latency] : []], []);
        const smallLatenciesHistogram = integersToHistogram(smallLatencies, { binSize: 20 });
        const bigLatenciesHistogram = integersToHistogram(bigLatencies, { binSize: 100 });

        return {
          backend,
          latency: {
            ...smallLatenciesHistogram,
            ...bigLatenciesHistogram,
          },
        };
      })
    );

  return latency$;
};

export default telemetryLatency;
