import { share } from 'rxjs/operators';
import background from '../core/base/background';
import utils from '../core/utils';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import { promiseHttpHandler } from '../core/http';
import {
  setDefaultSearchEngine,
  getEngineByQuery,
  getSearchEngineQuery,
} from '../core/search-engines';
import ObservableProxy from '../core/helpers/observable-proxy';
import events from '../core/events';
import {
  isUrl,
  getSearchEngineUrl,
  getVisitUrl,
  fixURL,
} from '../core/url';

// providers
import Calculator from './providers/calculator';
import Cliqz from './providers/cliqz';
import History from './providers/history';
import HistoryView from './providers/history-view';
import HistoryLookup from './providers/history-lookup';
import Instant from './providers/instant';
import QuerySuggestions from './providers/query-suggestions';
import RichHeader, { getRichHeaderQueryString } from './providers/rich-header';

import getThrottleQueries from './operators/streams/throttle-queries';

import logger from './logger';
import telemetry from './telemetry';
import telemetryLatency from './telemetry-latency';
import getConfig from './config';
import search from './search';
import getSnippet from './rich-header-snippet';
import addCustomSearchEngines from './search-engines/add-custom-search-engines';

import AdultAssistant from './assistants/adult';
import LocationAssistant from './assistants/location';
import * as offersAssistant from './assistants/offers';
import settingsAssistant from './assistants/settings';
import pluckResults from './operators/streams/pluck-results';
import { isMobile } from '../core/platform';

/**
  @namespace search
  @module search
  @class Background
 */
export default background({
  requiresServices: ['search-services', 'logos', 'cliqz-config'],

  core: inject.module('core'),
  search: inject.module('search'),

  /**
    @method init
    @param settings
  */
  init(settings) {
    this.settings = settings;
    const geolocation = inject.module('geolocation');
    this.searchSessions = new Map();
    this.adultAssistant = new AdultAssistant();
    this.locationAssistant = new LocationAssistant({
      updateGeoLocation: geolocation.action.bind(geolocation, 'updateGeoLocation'),
      resetGeoLocation: geolocation.action.bind(geolocation, 'resetGeoLocation'),
    });

    addCustomSearchEngines();

    this.providers = {
      calculator: new Calculator(),
      cliqz: new Cliqz(),
      history: new History(),
      historyView: new HistoryView(),
      historyLookup: new HistoryLookup(),
      instant: new Instant(),
      querySuggestions: new QuerySuggestions(),
      richHeader: new RichHeader(settings), //
    };
  },

  resetAssistantStates() {
    this.adultAssistant.resetAllowOnce();
    this.locationAssistant.resetAllowOnce();
  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  events: {
    'control-center:setDefault-search': function onSetDefaultSearchEngine(engine) {
      setDefaultSearchEngine(engine);
    },
    'control-center:setDefault-indexCountry': function setCountryIndex(country) {
      prefs.clear('backend_country.override');
      prefs.set('backend_country', country);
    },
  },

  actions: {
    reportHighlight({ contextId, tab: { id: tabId } = {} } = { tab: {} }) {
      const sessionId = tabId || contextId;

      if (!this.searchSessions.has(sessionId)) {
        return;
      }

      const { highlightEventProxy } = this.searchSessions.get(sessionId);

      highlightEventProxy.next();
    },
    reportSelection(selectionReport, { contextId, tab: { id: tabId } = {} } = { tab: {} }) {
      const sessionId = tabId || contextId;

      if (!this.searchSessions.has(sessionId)) {
        return;
      }

      const { selectionEventProxy } = this.searchSessions.get(sessionId);

      selectionEventProxy.next(selectionReport);
    },
    stopSearch({ contextId, tab: { id: tabId } = {} } = { tab: {} }) {
      const sessionId = tabId || contextId;

      this.resetAssistantStates();
      if (!this.searchSessions.has(sessionId)) {
        return;
      }

      const {
        telemetrySubscription,
        telemetryLatencySubscription,
        resultsSubscription,
        focusEventProxy,
      } = this.searchSessions.get(sessionId);

      focusEventProxy.next({ event: 'blur' });

      resultsSubscription.unsubscribe();
      telemetrySubscription.unsubscribe();
      telemetryLatencySubscription.unsubscribe();

      this.searchSessions.delete(sessionId);

      events.pub('search:session-end', {
        windowId: sessionId,
      });
    },

    // TODO: debounce (see observables/urlbar)
    startSearch(
      query,
      {
        allowEmptyQuery = false,
        isPasted = false,
        isPrivate = false,
        isTyped = true,
        keyCode,
        forceUpdate = !isMobile,
      } = {},
      { contextId, tab: { id: tabId } = {} } = { tab: {} },
    ) {
      const sessionId = tabId || contextId;
      const now = Date.now();

      if (this.searchSessions.has(sessionId)) {
        const queryEventProxy = this.searchSessions.get(sessionId).queryEventProxy;
        queryEventProxy.next({
          isPrivate,
          isTyped,
          query,
          tabId: sessionId,
          keyCode,
          isPasted,
          forceUpdate,
          allowEmptyQuery,
          ts: now,
        });
        return;
      }

      const _config = getConfig({
        isPrivateMode: isPrivate,
      }, this.settings);

      const selectionEventProxy = new ObservableProxy();
      const queryEventProxy = new ObservableProxy();
      const focusEventProxy = new ObservableProxy();
      const highlightEventProxy = new ObservableProxy();

      const query$ = queryEventProxy.observable
        .pipe(
          getThrottleQueries(_config),
          share()
        );
      const focus$ = focusEventProxy.observable.pipe(share());
      const selection$ = selectionEventProxy.observable.pipe(share());
      const highlight$ = highlightEventProxy.observable.pipe(share());

      const responses$ = search(
        { query$, focus$, highlight$ },
        this.providers,
        _config,
      ).pipe(share());

      const results$ = responses$
        .pipe(
          pluckResults(),
          share()
        );

      const telemetry$ = telemetry(focus$, query$, results$, selection$);
      const telemetrySubscription = telemetry$.subscribe(
        data => utils.telemetry(data, false, 'search.session'),
        error => logger.error('Failed preparing telemetry', error)
      );

      const telemetryLatency$ = telemetryLatency(focus$, query$, results$);
      const telemetryLatencySubscription = telemetryLatency$.subscribe(
        data => utils.telemetry(data, false, 'metrics.search.latency'),
        error => logger.error('Failed preparing latency telemetry', error)
      );

      const resultsSubscription = responses$.subscribe((responses) => {
        const results = (responses.responses[0] && responses.responses[0].results) || [];
        const {
          tabId: _tabId,
          query: _query,
          ts: queriedAt,
          ...meta,
        } = responses.query;

        if (tabId) {
          this.core.action(
            'broadcastActionToWindow',
            tabId,
            'overlay',
            'renderResults',
            results
          );
        } else {
          this.core.action(
            'broadcast',
            {
              action: 'renderResults',
              args: [JSON.stringify(results)],
              contextId,
            },
          );
        }

        events.pub('search:results', {
          tabId: _tabId,
          query: _query,
          queriedAt,
          meta,
          results,
          windowId: sessionId,
        });
      });

      focusEventProxy.next({ event: 'focus' });

      queryEventProxy.next({
        isPrivate,
        isTyped,
        query,
        tabId: sessionId,
        keyCode,
        isPasted,
        allowEmptyQuery,
        ts: now,
      });

      this.searchSessions.set(sessionId, {
        focusEventProxy,
        queryEventProxy,
        highlightEventProxy,
        selectionEventProxy,
        telemetrySubscription,
        resultsSubscription,
        telemetryLatencySubscription,
      });
    },
    /**
     * fetches extra info for result from rich header
     */
    getSnippet(query, result) {
      const loc = {
        latitude: utils.USER_LAT,
        longitude: utils.USER_LNG,
      };
      const url = this.settings.RICH_HEADER + getRichHeaderQueryString(
        query,
        loc,
      );
      const resultData = {
        q: query,
        loc,
        results: [
          {
            url: result.url,
            snippet: {
              title: result.title,
              description: result.description,
            },
          }
        ],
      };

      return getSnippet(url, JSON.stringify(resultData), 10);
    },

    getNews(newsEndpointUrl, { params = '', query = '' } = {}) {
      function requestBackend(url, data) {
        return promiseHttpHandler('PUT', url, data).then((response) => {
          const resData = JSON.parse(response.response);
          if (!resData.results || resData.results.length === 0) {
            throw new Error(`Backend response from ${url} is not valid "${JSON.stringify(resData)}."`);
          } else if (!resData.results[0].snippet.extra) {
            throw new Error(`Backend response from ${url} is empty "${JSON.stringify(resData)}."`);
          }
          return {
            results: [resData.results[0].snippet.extra]
          };
        });
      }

      const url = this.settings.RICH_HEADER + getRichHeaderQueryString(query) + params;
      const data = {
        q: query,
        results: [
          {
            url: newsEndpointUrl,
            snippet: {}
          }
        ]
      };
      return requestBackend(url, JSON.stringify(data));
    },

    setDefaultSearchEngine(name) {
      return setDefaultSearchEngine(name);
    },

    setBackendCountry(country) {
      prefs.clear('backend_country.override');
      prefs.set('backend_country', country);
    },

    getBackendCountries() {
      return this.search.windowAction(utils.getWindow(), 'getBackendCountries');
    },

    setAdultFilter(filter) {
      prefs.set('adultContentFilter', filter);
    },

    setQuerySuggestions(enabled) {
      prefs.set('suggestionsEnabled', enabled);
    },

    async adultAction(actionName, query, sender) {
      if (this.adultAssistant.hasAction(actionName)) {
        await this.adultAssistant[actionName]();
        await this.actions.startSearch(query, {
          allowEmptyQuery: false,
          isPasted: false,
          isPrivate: false,
          isTyped: true,
          forceUpdate: true,
        }, sender);
      }
    },

    async locationAction(actionName, query, rawResult) {
      if (this.locationAssistant.hasAction(actionName)) {
        await this.locationAssistant[actionName]();
        const snippet = await this.actions.getSnippet(query, rawResult);
        return {
          snippet,
          locationState: this.locationAssistant.getState(),
        };
      }
      return null;
    },

    getAssistantStates() {
      return {
        adult: this.adultAssistant.getState(),
        location: this.locationAssistant.getState(),
        offers: offersAssistant.getState(),
        settings: settingsAssistant.getState(),
      };
    },

    queryToUrl(query = '') {
      let handledQuery = '';

      if (isUrl(query)) {
        handledQuery = getVisitUrl(fixURL(query));
      } else {
        const engine = getEngineByQuery(query);
        const rawQuery = getSearchEngineQuery(engine, query);

        handledQuery = getSearchEngineUrl(engine, query, rawQuery);
      }

      return handledQuery;
    }
  },
});
