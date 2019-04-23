import { share, filter, map, debounceTime } from 'rxjs/operators';

// operators
import Enricher from '../operators/enricher';

// mixers
import ContextSearch from '../mixers/context-search';
import deduplicate from '../mixers/deduplicate';
import enrich from '../mixers/enrich';
import { searchOnEmpty, searchOnNotEmpty } from '../mixers/search-on-empty';
import updateIncompleteResults from '../mixers/update-incomplete-results';
import addOffers from '../mixers/add-offers';
import addSnippets from '../mixers/add-snippets';
import removeOffers from '../operators/remove-offers';
import waitForResultsFrom from '../operators/streams/wait-for-results-from';
import combineAnyLatest from '../operators/streams/static/combine-any-latest';

/*
 * Constructs a result stream by mixing results from multiple providers
 * for the given query string.
 */
const mixResults = ({ query, ...params }, providers, enricher = new Enricher(), config) => {
  const results = {
    instant: Object.create(null),
    calculator: Object.create(null),
    history: Object.create(null),
    historyView: Object.create(null),
    cliqz: Object.create(null),
    querySuggestions: Object.create(null),
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
  results.instant.source$ = providers.instant.search(...searchParams);
  results.calculator.source$ = providers.calculator.search(...searchParams);

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

  // TODO: how to update 'kind' for enriched history results?
  results.history.enriched$ = enrich(
    enricher,
    results.history.resultsWithOffers$,
    results.cliqz.expanded$
  );

  const deduplicated = deduplicate(
    results.cliqz.expanded$,
    results.history.enriched$,
  );
  results.cliqz.deduplicated$ = deduplicated.target$;
  results.history.annotated$ = deduplicated.reference$;

  results.instant.latest$ = results.instant.source$;
  results.calculator.latest$ = results.calculator.source$;
  results.history.latest$ = results.history.annotated$;
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
