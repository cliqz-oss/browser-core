import { from, empty, merge } from 'rxjs';
import { share, map, delay } from 'rxjs/operators';
import { fetch } from '../../core/http';
import prefs from '../../core/prefs';
import cliqzConfig from '../../core/config';
import CliqzLanguage from '../../core/language';
import { isOnionModeFactory } from '../../core/platform';
import inject from '../../core/kord/inject';
import BackendProvider from './backend';
import { getResponse, getEmptyResponse } from '../responses';
import {
  encodeLocale,
  encodePlatform,
  encodeResultOrder,
  encodeCountry,
  encodeFilter,
  encodeLocation,
  encodeSessionParams,
} from './cliqz-helpers';
import { PROVIDER_CLIQZ, PROVIDER_OFFERS, PROVIDER_SNIPPETS } from '../consts';
import { QuerySanitizerWithHistory } from './cliqz/query-sanitizer';

const querySanitizer = new QuerySanitizerWithHistory();
const isOnionMode = isOnionModeFactory(prefs);
const hpnv2Available = cliqzConfig.modules.indexOf('hpnv2') !== -1;

function getEmptyBackendResponse(query) {
  return {
    response: {
      results: [],
      offers: [],
    },
    query,
  };
}

const encodeResultCount = count => `&count=${count || 5}`;
const encodeQuerySuggestionParam = () => {
  const suggestionsEnabled = prefs.get('suggestionsEnabled', false)
    || prefs.get('suggestionChoice', 0) === 1;

  return `&suggest=${suggestionsEnabled ? 1 : 0}`;
};

const getResultsProviderQueryString = (q, {
  resultOrder,
  backendCountry,
  count,
}) => {
  let numberResults = count || 5;
  if (prefs.get('modules.context-search.enabled', false)) {
    numberResults = 10;
  }
  return encodeURIComponent(q)
    + encodeSessionParams()
    + CliqzLanguage.queryString()
    + encodeLocale()
    + encodePlatform()
    + encodeResultOrder(resultOrder)
    + encodeCountry(backendCountry)
    + encodeFilter()
    + encodeLocation()
    + encodeResultCount(numberResults)
    + encodeQuerySuggestionParam();
};

const getBackendResults = (originalQuery, config, params = {}) => {
  if (isOnionMode()) {
    return Promise.resolve(getEmptyBackendResponse(originalQuery));
  }

  // Run some heuristics to prevent certain patterns like pasted or
  // edited URLs are unintentionally sent to the search. Either block
  // these queries completely, or replace them by a safe subset of the
  // query if possible.
  //
  // (The entries in the safe-query cache are in memory only and should
  // quickly get evicted by new searches. But to be safe, never add
  // entries in private mode.)
  const rememberSafeQueries = !params.isPrivate;
  const q = prefs.get('query-sanitizer', true)
    ? querySanitizer.sanitize(originalQuery, { rememberSafeQueries }) : originalQuery;

  if (!q) {
    return Promise.resolve(getEmptyBackendResponse(originalQuery));
  }

  const url = config.settings.RESULTS_PROVIDER + getResultsProviderQueryString(q, params);

  const searchSessionService = inject.service('search-session', [
    'incrementSessionSeq',
    'getQueryLastDraw',
    'setQueryLastDraw',
    'incrementQueryCount',
  ]);
  searchSessionService.incrementSessionSeq();

  // if the user sees the results more than 500ms we consider that he starts a new query
  const queryLastDraw = searchSessionService.getQueryLastDraw();
  if (queryLastDraw && (Date.now() > queryLastDraw + 500)) {
    searchSessionService.incrementQueryCount();
  }
  searchSessionService.setQueryLastDraw(0);
  const privacyOptions = {
    credentials: 'omit',
    cache: 'no-store',
  };

  // If private mode or query proxying is enabled, go through hpnv2
  const fetchHandler = (hpnv2Available && (config.isPrivateMode || prefs.get('hpn-query', false)))
    ? (...args) => inject.module('hpnv2').action('search', ...args)
    : fetch;

  const startTs = Date.now();
  const backendPromise = fetchHandler(url, privacyOptions, params)
    .then(res => res.json())
    .then((response) => {
      response.latency = Date.now() - startTs;

      if (prefs.get('myoffrz.experiments.001.position', 'first') === 'last') {
        const offerResults = response.results.filter(r => r.template === 'offer');
        const nonOfferResults = response.results.filter(r => r.template !== 'offer');

        response.results = [
          ...nonOfferResults,
          ...offerResults,
        ];
      }
      if ((response.results && (response.results.length > 0 || !config.settings.suggestions))
        || (response.offers && response.offers.length > 0)) {
        return {
          response,
          query: q
        };
      }

      return { response: getEmptyResponse(this.id, config, q), query: q };
    });


  return backendPromise;
};
export default class Cliqz extends BackendProvider {
  constructor() {
    super(PROVIDER_CLIQZ);
    this.cache = new Map();
  }

  fetch(q, config, params) {
    return getBackendResults(q, config, params)
      .then(e => e.response)
      .catch(error => ({ q, results: [], error }));
  }

  // TODO: fix me
  getEmptySearch(config) {
    return from([
      getEmptyResponse(this.id, config),
      getEmptyResponse(PROVIDER_OFFERS, config),
      getEmptyResponse(PROVIDER_SNIPPETS, config),
    ]);
  }

  search(query, config, params) {
    if (!query || !config.providers[this.id].isEnabled) {
      return this.getEmptySearch(config);
    }

    const { providers: {
      cliqz: { includeSnippets, includeOffers, count, jsonp } = {}
    } = {} } = config;

    // TODO: only get at beginning of search session
    Object.assign(params, {
      backendCountry: prefs.get('backend_country.override', prefs.get('backend_country', 'de')),
      count,
      jsonp,
    });

    const cliqz$ = from(this.fetch(query, config, params))
      .pipe(share());

    const results$ = cliqz$
      .pipe(
        map(({ results = [], latency, suggestions }) => getResponse({
          provider: this.id,
          config,
          query,
          suggestions,
          results: this.mapResults({
            results,
            query,
            provider: null,
            latency,
            backendCountry: params.backendCountry,
          }),
          state: 'done',
        })),
        this.getOperators()
      );

    // offers are optionally included depending on config;
    // if included, any consumer of `search` needs to split
    // the returned stream

    const offersProvider = Object.assign({}, this, { id: PROVIDER_OFFERS });
    const offers$ = cliqz$
      .pipe(
        map(({ offers = [] }) => getResponse({
          provider: PROVIDER_OFFERS,
          config,
          query,
          results: this.mapResults({ results: offers, query, provider: offersProvider.id }),
          state: 'done',
        })),
        this.getOperators.call(offersProvider, config)
      );

    const snippetsProvider = Object.assign({}, this, { id: PROVIDER_SNIPPETS });
    const snippets$ = cliqz$
      .pipe(
        map(({ snippets = [] }) => getResponse({
          provider: PROVIDER_SNIPPETS,
          config,
          query,
          results: this.mapResults({ results: snippets, query, provider: snippetsProvider.id }),
          state: 'done',
        })),
        this.getOperators.call(snippetsProvider, config)
      );

    return merge(
      results$,
      includeOffers ? offers$ : empty(),
      includeSnippets ? snippets$ : empty(),
    ).pipe(
      // TODO: check if this is really needed
      delay(0)
    );
  }
}
