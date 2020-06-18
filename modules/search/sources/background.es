/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { share } from 'rxjs/operators';
import background from '../core/base/background';
import telemetry from '../core/services/telemetry';
import { getMessage } from '../core/i18n';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import { promiseHttpHandler } from '../core/http';
import { setDefaultSearchEngine, getSearchEnginesAsync } from '../core/search-engines';
import ObservableProxy from '../core/helpers/observable-proxy';
import events from '../core/events';

// providers
import Calculator from './providers/calculator';
import Cliqz from './providers/cliqz';
import History from './providers/history';
import HistoryView from './providers/history-view';
import Instant from './providers/instant';
import QuerySuggestions from './providers/query-suggestions';
import RichHeader, { getRichHeaderQueryString } from './providers/rich-header';
import Tabs from './providers/tabs';

import getThrottleQueries from './operators/streams/throttle-queries';

import logger from './logger';
import searchTelemetry from './telemetry';
import performance from './performance-telemetry';
import telemetryLatency from './telemetry-latency';
import getConfig from './config';
import search from './search';
import getSnippet from './rich-header-snippet';
import addCustomSearchEngines from './search-engines/add-custom-search-engines';
import searchSessionService from './services/search-session';

import AdultAssistant from './assistants/adult';
import LocationAssistant from './assistants/location';
import * as offersAssistant from './assistants/offers';
import settingsAssistant from './assistants/settings';
import pluckResults from './operators/streams/pluck-results';
import { bindAll } from '../core/helpers/bind-functions';
import { chrome } from '../platform/globals';

// Telemetry schemas
import historyVisitMetric from './telemetry/metrics/history-visits';
import latencyMetric from './telemetry/metrics/session/latency';
import sessionMetric from './telemetry/metrics/session/interaction';

import newsAnalysis from './telemetry/analyses/sessions/news';
import interactionAnalysis from './telemetry/analyses/sessions/interaction';
import smartCliqzAnalysis from './telemetry/analyses/sessions/smart-cliqz';
import searchEnginesAnalysis from './telemetry/analyses/sessions/search-engines';
import historyVisitAnalysis from './telemetry/analyses/history-visits';

const ADULT_FILTER_PREF = 'adultContentFilter';

const performanceTelemetryEnabled = !!chrome.webRequest;

function getProviders() {
  const currentBackend = prefs.get('backend_country', 'de');
  const all = JSON.parse(prefs.get('config_backends', '["de"]'))
    .reduce((acc, cur) => {
      acc[cur] = {
        selected: cur === currentBackend,
        name: getMessage(`country_code_${cur.toUpperCase()}`),
      };
      return acc;
    }, {});
  if (prefs.has('backend_country.override')) {
    const customCountry = prefs.get('backend_country.override');
    all[customCountry] = {
      selected: true,
      name: `Custom - [${customCountry}]`
    };
  }
  return all;
}

/**
  @namespace search
  @module search
  @class Background
 */
export default background({
  requiresServices: [
    'search-services',
    'logos',
    'cliqz-config',
    'geolocation',
    'telemetry',
    'search-session',
    'session',
  ],
  providesServices: {
    'search-session': searchSessionService,
  },

  core: inject.module('core'),
  search: inject.module('search'),
  insights: inject.module('insights'),

  geolocation: inject.service('geolocation', [
    'updateGeoLocation',
    'resetGeoLocation',
    'waitForGeolocation',
  ]),

  searchSession: inject.service('search-session', [
    'setSearchSession',
  ]),

  telemetrySchemas: [
    historyVisitMetric,
    latencyMetric,
    sessionMetric,
    newsAnalysis,
    interactionAnalysis,
    smartCliqzAnalysis,
    searchEnginesAnalysis,
    historyVisitAnalysis,
  ],

  /**
    @method init
    @param settings
  */
  init(settings, browser) {
    telemetry.register(this.telemetrySchemas);

    this.settings = settings;
    this.searchSessions = new Map();
    this.adultAssistant = new AdultAssistant();
    this.locationAssistant = new LocationAssistant({
      updateGeoLocation: () => this.geolocation.updateGeoLocation(),
      resetGeoLocation: () => this.geolocation.resetGeoLocation(),
    });
    this.resetAssistantStates();

    addCustomSearchEngines();
    this.searchSession.setSearchSession();
    const { tabs } = browser;

    this.providers = {
      calculator: new Calculator(),
      cliqz: new Cliqz(),
      history: new History(),
      historyView: new HistoryView(),
      instant: new Instant(),
      querySuggestions: new QuerySuggestions(),
      richHeader: new RichHeader(settings), //
      tabs: new Tabs({ tabs }),
    };

    for (const provider of Object.values(this.providers)) {
      provider.init();
    }


    if (performanceTelemetryEnabled) {
      // some platforms might not have webRequest
      performance.init();
    }
  },

  resetAssistantStates() {
    this.adultAssistant.resetAllowOnce();
    this.locationAssistant.resetAllowOnce();
  },

  unload() {
    telemetry.unregister(this.telemetrySchemas);

    if (performanceTelemetryEnabled) {
      performance.unload();
    }

    for (const provider of Object.values(this.providers)) {
      provider.unload();
    }
  },

  async status() {
    let engines = await getSearchEnginesAsync();
    try {
      engines = engines.map(engine => ({
        name: engine.name,
        code: engine.code,
        alias: engine.alias,
        default: engine.default,
      }));
    } catch (e) {
      // may be not initailized yet
    }
    return {
      visible: true,
      state: engines,
      supportedIndexCountries: getProviders(),
      quickSearchEnabled: prefs.get('modules.search.providers.cliqz.enabled', true),
      showQuerySuggestions: prefs.get('suggestionsEnabled', false)
    };
  },

  events: {
    'control-center:setDefault-search': function onSetDefaultSearchEngine(engine) {
      setDefaultSearchEngine(engine);
    },
    'control-center:setDefault-indexCountry': function setCountryIndex(country) {
      prefs.clear('backend_country.override');
      prefs.set('backend_country', country);
    },
    ...bindAll(performanceTelemetryEnabled ? performance.events : {}, performance),
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

      if (selectionReport.action === 'enter' && !selectionReport.rawResult) {
        // User hit 'Enter' before any results arrived
        events.pub('ui:enter', selectionReport);
      } else {
        events.pub('ui:click-on-url', selectionReport);
      }

      if (!this.searchSessions.has(sessionId)) {
        return;
      }

      const { selectionEventProxy } = this.searchSessions.get(sessionId);

      selectionEventProxy.next(selectionReport);
    },
    stopSearch(
      { contextId, tab: { id: tabId } = {} } = { tab: {} }
    ) {
      if (arguments.length > 1) {
        logger.error('"stopSearch" action no longer accepts arguments.');
        return;
      }
      const sessionId = tabId || contextId;
      events.pub('search:session-end', {
        windowId: sessionId,
      });

      this.resetAssistantStates();
      this.searchSession.setSearchSession();
      if (!this.searchSessions.has(sessionId)) {
        return;
      }

      const {
        telemetrySubscription,
        telemetryResultsSubscription,
        telemetryLatencySubscription,
        resultsSubscription,
        focusEventProxy,
      } = this.searchSessions.get(sessionId);

      focusEventProxy.next({ event: 'blur' });

      resultsSubscription.unsubscribe();
      telemetrySubscription.unsubscribe();
      telemetryResultsSubscription.unsubscribe();
      telemetryLatencySubscription.unsubscribe();

      this.searchSessions.delete(sessionId);
    },

    // TODO: debounce (see observables/urlbar)
    startSearch(
      query,
      {
        allowEmptyQuery = false,
        isPasted = false,
        queryId,
        isPrivate = false,
        isTyped = true,
        keyCode,
        entryPoint,
        forceUpdate = false,
      } = {},
      { contextId, frameId, tab: { id: tabId } = {} } = { tab: {} },
    ) {
      const sessionId = tabId || contextId;
      const now = Date.now();
      const assistantStates = this.actions.getAssistantStates();

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
          assistantStates,
          queryId,
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

      const telemetry$ = searchTelemetry(focus$, query$, results$, selection$, highlight$);
      const telemetrySubscription = telemetry$.subscribe(
        data => telemetry.push(data, 'search.metric.session.interaction'),
        error => logger.error('Failed preparing telemetry', error)
      );

      // For insights module to calculate search time saved
      const telemetryResultsSubscription = telemetry$.subscribe(
        (data) => {
          if (_config.isPrivateMode || !this.insights.isPresent()) {
            return; // Don't count in private mode
          }

          if (Number.isInteger(data.selection.index)) { // If user selected a result
            if (data.selection.sources[0] === 'default-search') {
              return; // Alternative search engine, we don't count this
            }

            if (['C', 'H'].indexOf(data.selection.sources[0]) !== -1) { // History result
              this.insights.action('insertSearchStats', { historySelected: 1 });
            } else { // Organic result
              this.insights.action('insertSearchStats', { organicSelected: 1 });
            }
            return;
          }
          // When no result was selected, check if a smartcliqz was shown
          if (data.results && data.results.some(result =>
            result.sources[0] === 'X' && result.classes[0] !== 'EntityGeneric')) {
            this.insights.action('insertSearchStats', { smartCliqzTriggered: 1 });
          }
        },
        error => logger.error('Failed preparing telemetry', error),
      );

      const telemetryLatency$ = telemetryLatency(focus$, query$, results$);
      const telemetryLatencySubscription = telemetryLatency$.subscribe(
        data => telemetry.push(data, 'search.metric.session.latency'),
        error => logger.error('Failed preparing latency telemetry', error)
      );

      const resultsSubscription = responses$.subscribe((responses) => {
        const { results = [], suggestions = [] } = responses.responses[0] || {};
        const {
          tabId: _tabId,
          query: _query,
          queryId, // eslint-disable-line no-shadow
          forceUpdate, // eslint-disable-line no-shadow
          ts,
          ...meta
        } = responses.query;

        const response = {
          tabId: _tabId,
          query: _query,
          queryId,
          forceUpdate,
          meta,
          results,
          suggestions,
          windowId: sessionId,
          assistantStates: this.actions.getAssistantStates(),
        };

        if (!tabId) {
          this.core.action('broadcast', '', {
            module: 'dropdown',
            action: 'renderResults',
            contextId,
            args: [response],
          });
        } else {
          this.core.action(
            'callContentAction',
            'dropdown',
            // targetModule,
            'renderResults',
            { windowId: tabId, frameId },
            response
          );
        }

        events.pub('search:results', response);
      });

      focusEventProxy.next({ event: 'focus', entryPoint });

      queryEventProxy.next({
        isPrivate,
        isTyped,
        query,
        tabId: sessionId,
        keyCode,
        isPasted,
        allowEmptyQuery,
        assistantStates,
        queryId,
        ts: now,
      });

      this.searchSessions.set(sessionId, {
        focusEventProxy,
        queryEventProxy,
        highlightEventProxy,
        selectionEventProxy,
        telemetrySubscription,
        telemetryResultsSubscription,
        resultsSubscription,
        telemetryLatencySubscription,
      });
    },
    /**
     * fetches extra info for result from rich header
     */
    async getSnippet(query, result) {
      // Get location from `geolocation` module if available
      let loc = { latitude: null, longitude: null };
      try {
        loc = await this.geolocation.waitForGeolocation();
      } catch (ex) {
        /* Could not get geolocation */
      }

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
      return getProviders();
    },

    setAdultFilter(filter) {
      prefs.set(ADULT_FILTER_PREF, filter);
    },

    getAdultFilter() {
      return prefs.get(ADULT_FILTER_PREF);
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
  },
});
