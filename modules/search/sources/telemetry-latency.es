const telemetryLatency = (focus$, query$, results$) => {
  // collect all results during one search session
  const allResults$ = focus$
    // 'focus' marks start of a search session
    .filter(({ event }) => event === 'focus')
    .switchMap(() => query$
      // ensure that only results are reported once per query by only
      // letting through the first result list that contains some cliqz
      // results
      .switchMap(({ query }) => results$
        .filter(results => results.some(({ provider, text }) =>
          // need to check for query because of smoothing: there might be
          // cliqz results for a new query, but these results may still be
          // from the previous query
          text === query && provider === 'cliqz'))
        .first()
      )
      // clear on new search session
      .startWith([])
      // collect all results
      .scan((acc, cur) => [...acc, cur])
    );

  const latency$ = focus$
    // 'blur' marks end of a search session
    .filter(({ event }) => event === 'blur')
    // get latest list of results
    .withLatestFrom(allResults$)
    // only care about results, not the blur event
    .map(([, allResults]) => allResults)
    .map(allResults => allResults.map(
      results => results
        // only cliqz results contain latency information
        .filter(({ provider }) => provider === 'cliqz')
        // extract latency
        .map(({ meta: { latency, backendCountry } = {} }) => ({ latency, backendCountry }))
        // only take one latency value (they are the same for all cliqz
        // results of the same query since we only make one call to the
        // backend per query)
        .reduce((acc, cur) => cur)));
    // TODO: optimize this by returning only one backendCountry

  return latency$;
};

export default telemetryLatency;
