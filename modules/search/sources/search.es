import Rx from '../platform/lib/rxjs';
import { utils } from '../core/cliqz';

// providers
import Calculator from './providers/calculator';
import Cliqz from './providers/cliqz';
import History from './providers/history';
import Instant from './providers/instant';
import QuerySuggestions from './providers/query-suggestions';

// operators
import cluster from './operators/cluster';
import collect from './operators/collect';
import decrease from './operators/decrease';
import deduplicate from './operators/deduplicate';
import Enricher from './operators/enricher';
import except from './operators/except';
import limit from './operators/limit';
import merge from './operators/merge';
// TODO: move to providers?
import normalize from './operators/normalize';
import reconstruct from './operators/reconstruct';
import trim from './operators/trim';
import update from './operators/update';


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


let startAt = Date.now();

const apply = ({ results, ...response }, operator) => ({
  results: results.map(operator),
  ...response,
});

const pending = {
  results: [],
  state: 'pending',
  provider: 'na',
};

const empty = {
  results: [],
  state: 'done',
  provider: 'na',
};

const log = msg => utils.log('xxx', Date.now() - startAt, msg);
const logResults = r => log(`${r.provider}|${r.state} (${r.results.length})`);

const calculatorProvider = new Calculator();
const cliqzProvider = new Cliqz();
const historyProvider = new History();
const instantProvider = new Instant();
const querySuggestionsProvider = new QuerySuggestions();

const applyProviderOperators = provider =>
  provider
    .scan(collect)
    // TODO: where to get the provider name from?
    .startWith(pending)
    .delay(1)
    .share()
    .map(results => apply(results, normalize))
    .do(logResults);

const createResultStream = (query, enricher) => {
  // TODO: filter Cliqz and Google search URLs
  // TODO: also dedup within history results
  // TODO: filter moz-actions
  const historyStream = historyProvider
    .search(query)
    // TODO: add alternative condition (e.g., > 3 results returned)
    .bufferTime(1)
    .filter(r => r.length > 0)
    .scan(collect, pending)
    // to make `combineLatest` emit immediately
    .startWith(pending)
    // `cliqzStreamDeduplicated` won't get the first history result otherwise,
    // supposingly because it subscribes too late (i.e., after `historyStream`
    // emmitted its first result); is there another way to synchonise?
    // `publish` did not seem to work
    .delay(1)
    .map(results => apply(results, normalize))
    .map(deduplicate)
    .share()
    .do(logResults);


  const cliqzStream = cliqzProvider
    .search(query)
    .let(applyProviderOperators);

  // TODO: deduplicate
  const instantStream = instantProvider
    .search(query)
    .let(applyProviderOperators);

  const calculatorStream = calculatorProvider
    .search(query)
    .let(applyProviderOperators);

  const querySuggestionsStream = cliqzStream
    // skip artifially inserted empty result (`startWith`)
    .skip(1)
    // only start searching if we don't have backend results
    .filter(r => r.state === 'done' && r.results.length === 0)
    .take(1)
    .flatMap(() =>
      querySuggestionsProvider
        .search(query)
        .scan(collect)
    )
    .startWith(empty)
    .map(results => apply(results, normalize))
    .do(logResults);

  const cliqzStreamDeduplicated = cliqzStream
    .combineLatest(historyStream)
    // TODO: dedup before collecting (i.e., only for new results)
    .map(except)
    .share()
    .do(logResults);

  const historyStreamEnriched = enricher
    .connect(historyStream, cliqzStream)
    .map(cluster)
    .do(logResults);

  const combinedStream = Rx.Observable
    // TODO: throttle? mixes everytime one of the providers return
    .combineLatest(
      instantStream,
      calculatorStream,
      historyStreamEnriched,
      cliqzStreamDeduplicated,
      querySuggestionsStream,
    )
    // TODO: how to clear results if there are none?
    .do(r => log(`==> x (${r.length})`));

  return combinedStream;
};

const createQueryStream = (query) => {
  const enricher = new Enricher();

  const currentResults = query
    .do((q) => {
      startAt = Date.now();
      log(`======= QUERY '${q}' =======`);
    })
    .switchMap(q => createResultStream(q, enricher))
    .share();

  // TODO: rename, it's more like the latest responses with results (per provider)
  const bestResults = currentResults
    .scan((current, incoming) => current
      .map((cur, i) => {
        const next = incoming[i];
        if (next.state === 'pending' && next.results.length === 0) {
          return cur;
        }
        return next;
      })
    );

  const previousResults = query
    .withLatestFrom(bestResults)
    .map(([, results]) => results)
    .startWith([]);

  const updatedResults = currentResults
    .withLatestFrom(previousResults)
    .map(update);

  return updatedResults
    .map(responses => responses.map(limit))
    .map(merge)
    .map(decrease)
    .map(trim)
    .map(results => apply(results, reconstruct))
    .pluck('results');
};

const mixed = (query, focus) => {
  const top = focus
    .do(() => log('======= NEW SESSION ======='))
    .switchMap(() => createQueryStream(query));

  return top;
};

export default mixed;
