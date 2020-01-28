/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  share,
  filter,
  map,
  debounceTime,
  withLatestFrom,
  combineLatest,
  startWith,
} from 'rxjs/operators';

// operators
import ContextSearch from '../mixers/context-search';
import deduplicate from '../mixers/deduplicate';
import { searchOnEmpty, searchOnNotEmpty } from '../mixers/search-on-empty';
import updateIncompleteResults from '../mixers/update-incomplete-results';
import addOffers from '../mixers/add-offers';
import addSnippets from '../mixers/add-snippets';
import removeOffers from '../operators/remove-offers';
import waitForResultsFrom from '../operators/streams/wait-for-results-from';
import combineAnyLatest from '../operators/streams/static/combine-any-latest';
import { clearResults } from '../operators/responses/utils';
import annotateTabs from '../operators/responses/annotate-tabs';
import cluster from '../operators/cluster';
import enrich from '../operators/responses/enrich';

/*
 * Constructs a result stream by mixing results from multiple providers
 * for the given query string.
 */
const mixResults = ({ query, ...params }, providers, config, sessionStore) => {
  const results = {
    instant: Object.create(null),
    calculator: Object.create(null),
    history: Object.create(null),
    historyView: Object.create(null),
    cliqz: Object.create(null),
    querySuggestions: Object.create(null),
    tabs: Object.create(null),
  };

  const searchParams = [query, config, params];
  // TODO: also dedup within history results
  results.history.source$ = providers.history.search(...searchParams).pipe(share());
  results.historyView.source$ = searchOnNotEmpty(
    providers.historyView,
    results.history.source$,
    ...searchParams
  );
  results.cliqz.source$ = providers.cliqz.search(...searchParams).pipe(share());
  results.instant.source$ = providers.instant.search(...searchParams).pipe(share());
  results.calculator.source$ = providers.calculator.search(...searchParams).pipe(share());
  results.tabs.source$ = providers.tabs.search(...searchParams).pipe(share());

  results.cliqz.results$ = results.cliqz.source$.pipe(
    filter(({ provider }) => provider === 'cliqz'),
    map(removeOffers),
    share()
  );

  results.cliqz.offers$ = results.cliqz.source$.pipe(
    filter(({ provider }) => provider === 'cliqz::offers'),
    share()
  );

  results.cliqz.snippets$ = results.cliqz.source$.pipe(
    filter(({ provider }) => provider === 'cliqz::snippets'),
    share()
  );

  results.cliqz.resultsWithSnippets$ = addSnippets(
    results.cliqz.results$,
    results.cliqz.snippets$,
  );

  results.cliqz.resultsWithOffers$ = addOffers(
    results.cliqz.resultsWithSnippets$,
    results.cliqz.offers$,
    config,
  );

  results.history.resultsWithOffers$ = addOffers(
    results.history.source$,
    results.cliqz.offers$,
    config,
    { allowStandalone: false },
  );

  // fetch rich header promises
  results.cliqz.updated$ = updateIncompleteResults(
    providers.richHeader,
    results.cliqz.resultsWithOffers$,
    ...searchParams
  );

  // add search suggestions if no other results
  results.querySuggestions.source$ = searchOnEmpty(
    providers.querySuggestions,
    results.cliqz.updated$,
    ...searchParams
  );

  // contextSearch (if enabled) makes a second call to the cliqz
  const contextSearch = new ContextSearch();
  results.cliqz.expanded$ = contextSearch.search(
    providers.cliqz,
    results.cliqz.updated$,
    ...searchParams
  ).pipe(share());

  results.history.enriched$ = results.history.resultsWithOffers$.pipe(
    // 1. Cluster history
    map(cluster),
    // 2. Enrich history with backend results
    combineLatest(
      results.cliqz.expanded$.pipe(startWith({ results: [] }))
    ),
    map(([historyResponse, cliqzResponse]) => enrich(
      historyResponse,
      cliqzResponse,
      // Initialized in `handle-sessions`, persistent per session
      sessionStore.get('operators.responses.enrich.cache')
    )),
  );

  // Remove duplicates from backend results
  const deduplicated = deduplicate(
    results.cliqz.expanded$,
    results.history.enriched$,
  );
  results.cliqz.deduplicated$ = deduplicated.target$;
  results.history.annotated$ = deduplicated.reference$;

  // Solution for iOS (and web-extension-based products) to provide switch-to-tab functionality.
  // Does not affect desktop as the tabs provider is not enabled, thus not emitting results.
  // For details see doc of `annotateTabs` operator.
  results.history.annotatedWithTabs$ = results.history.annotated$.pipe(
    withLatestFrom(results.tabs.source$),
    map(annotateTabs),
  );
  results.tabs.emptied$ = results.tabs.source$.pipe(
    map(clearResults),
  );

  results.instant.latest$ = results.instant.source$;
  results.calculator.latest$ = results.calculator.source$;
  results.tabs.latest$ = results.tabs.emptied$;
  results.history.latest$ = results.history.annotatedWithTabs$;
  results.historyView.latest$ = results.historyView.source$;
  results.cliqz.latest$ = results.cliqz.deduplicated$;
  results.querySuggestions.latest$ = results.querySuggestions.source$;

  // sorting providers happens in `smooth` operator
  const latestResults = Object.keys(config.providers)
    .filter(id => results[id])
    .map((id) => {
      const dependencies = (config.providers[id].dependencies || [])
        .filter(({ condition }) => condition({
          query,
          keyCode: params.keyCode,
        }));

      // no dependencies
      if (dependencies.length === 0) {
        return results[id].latest$;
      }

      // wait until one of the dependencies has results
      return results[id].latest$.pipe(
        waitForResultsFrom(
          dependencies.map(({ provider }) => results[provider].latest$)
        )
      );
    });

  const mixed$ = combineAnyLatest(latestResults).pipe(
    // throttle because, otherwise, 'instant' will emit before 'history'
    // even if 'instant' was waiting for 'history' (supposingly due to
    // internal wiring of RxJS)
    debounceTime(1),
    map(responses => ({
      query: {
        query,
        ...params,
      },
      responses: responses.map(response => ({ ...response, params })),
    }))
  );
  return mixed$;
};

export default mixResults;
