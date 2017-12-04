import Rx from '../../platform/lib/rxjs';

// operators
import Enricher from '../operators/enricher';

// mixers
import deduplicate from '../mixers/deduplicate';
import enrich from '../mixers/enrich';
import searchOnEmpty from '../mixers/search-on-empty';
import updateIncompleteResults from '../mixers/update-incomplete-results';

/*
 * Constructs a result stream by mixing results from multiple providers
 * for the given query string.
 */
const mixResults = (query, providers, enricher = new Enricher(), config) => {
  // TODO: also dedup within history results
  const history$ = providers.history.search(query, config);
  const cliqz$ = providers.cliqz.search(query, config);
  const cliqzUpdated$ =
    updateIncompleteResults(query, providers.richHeader, cliqz$, config);

  const instant$ = providers.instant.search(query, config);
  const calculator$ = providers.calculator.search(query, config);
  const suggestions$ =
    searchOnEmpty(query, providers.querySuggestions, cliqzUpdated$, config);

  const cliqzDeduplicated$ = deduplicate(cliqzUpdated$, history$);
  const historyEnriched$ = enrich(enricher, history$, cliqzUpdated$);

  const mixed$ = Rx.Observable
    // TODO: throttle? mixes everytime one of the providers return
    .combineLatest(
      instant$,
      calculator$,
      historyEnriched$,
      cliqzDeduplicated$,
      suggestions$,
    );
  return mixed$;
};

export default mixResults;
