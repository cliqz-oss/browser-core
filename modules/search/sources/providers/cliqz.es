import Rx from '../../platform/lib/rxjs';
import utils from '../../core/utils';
import CONFIG from '../../core/config';
import prefs from '../../core/prefs';
import CliqzLanguage from '../../core/language';
import { isOnionMode } from '../../core/platform';
import BackendProvider from './backend';
import { getResponse, getEmptyResponse } from '../responses';
import { handleQuerySuggestions } from '../../platform/browser-actions';
import {
  encodeLocale,
  encodePlatform,
  encodeResultOrder,
  encodeCountry,
  encodeFilter,
  encodeLocation,
  encodeSessionParams,
} from './cliqz-helpers';
import { PROVIDER_CLIQZ, PROVIDER_OFFERS } from '../consts';
import { QuerySanitizerWithHistory } from './cliqz/query-sanitizer';

const querySanitizer = new QuerySanitizerWithHistory();

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
  const suggestionsEnabled = prefs.get('suggestionsEnabled', false) ||
    prefs.get('suggestionChoice', 0) === 1;

  return `&suggest=${suggestionsEnabled ? 1 : 0}`;
};

const encodeJSONPCallback = (jsonpCallback) => {
  const res = jsonpCallback
    ? `&callback=${jsonpCallback}`
    : '';

  return res;
};

const getResultsProviderQueryString = (q, {
  resultOrder,
  backendCountry,
  count,
  jsonpCallback
}) => {
  let numberResults = count || 5;
  if (prefs.get('modules.context-search.enabled', false)) {
    numberResults = 10;
  }
  return encodeURIComponent(q) +
    encodeSessionParams() +
    CliqzLanguage.stateToQueryString() +
    encodeLocale() +
    encodePlatform() +
    encodeResultOrder(resultOrder) +
    encodeCountry(backendCountry) +
    encodeFilter() +
    encodeJSONPCallback(jsonpCallback) +
    encodeLocation(true) + // @TODO: remove true
    encodeResultCount(numberResults) +
    encodeQuerySuggestionParam();
};

const getBackendResults = (originalQuery, params = {}) => {
  if (isOnionMode) {
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
  const q = prefs.get('query-sanitizer', true) ?
    querySanitizer.sanitize(originalQuery, { rememberSafeQueries }) : originalQuery;

  if (!q) {
    return Promise.resolve(getEmptyBackendResponse(originalQuery));
  }

  const url = CONFIG.settings.RESULTS_PROVIDER + getResultsProviderQueryString(q, params);
  const fetch = utils.fetchFactory();

  utils._sessionSeq += 1;

  // if the user sees the results more than 500ms we consider that he starts a new query
  if (utils._queryLastDraw && (Date.now() > utils._queryLastDraw + 500)) {
    utils._queryCount += 1;
  }
  utils._queryLastDraw = 0; // reset last Draw - wait for the actual draw
  const privacyOptions = {
    credentials: 'omit',
    cache: 'no-store',
  };

  const startTs = Date.now();
  const backendPromise = fetch(url, privacyOptions)
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
      if ((response.results && (response.results.length > 0 || !CONFIG.settings.suggestions))
        || (response.offers && response.offers.length > 0)) {
        return {
          response,
          query: q
        };
      }

      return getEmptyResponse(q);
    });


  return backendPromise;
};
export default class Cliqz extends BackendProvider {
  constructor() {
    super(PROVIDER_CLIQZ);
    this.cache = new Map();
  }

  fetch(q, params) {
    return getBackendResults(q, params)
      .then(e => e.response)
      .catch(error => ({ q, results: [], error }));
  }

  // TODO: fix me
  getEmptySearch(config) {
    return Rx.Observable.from([
      getEmptyResponse(this.id, config),
      getEmptyResponse(PROVIDER_OFFERS, config),
    ]);
  }

  search(query, config, params) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const { providers: { cliqz: { includeOffers, count, jsonpCallback } = {} } = {} } = config;

    // TODO: only get at beginning of search session
    Object.assign(params, {
      backendCountry: prefs.get('backend_country.override', prefs.get('backend_country', 'de')),
      count,
      jsonpCallback,
    });

    const cliqz$ = Rx.Observable
      .fromPromise(this.fetch(query, params))
      .share();

    cliqz$.subscribe(({ q, suggestions }) => handleQuerySuggestions(q, suggestions));

    const results$ = cliqz$
      .map(({ results = [], latency }) => getResponse(
        this.id,
        config,
        query,
        this.mapResults(results, query, null, latency, params.backendCountry),
        'done',
      ))
      .let(this.getOperators());

    // offers are optionally included depending on config;
    // if included, any consumer of `search` needs to split
    // the returned stream

    const offersProvider = Object.assign({}, this, { id: PROVIDER_OFFERS });
    const offers$ = cliqz$
      .map(({ offers = [] }) => getResponse(
        PROVIDER_OFFERS,
        config,
        query,
        this.mapResults(offers, query, offersProvider.id),
        'done',
      ))
      .let(this.getOperators.call(offersProvider, config));

    return Rx.Observable
      .merge(
        results$,
        includeOffers ? offers$ : Rx.Observable.empty(),
      )
      // TODO: check if this is really needed
      .delay(0);
  }
}
