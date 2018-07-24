import background from '../core/base/background';
import utils from '../core/utils';
import prefs from '../core/prefs';
import config from '../core/config';
import inject from '../core/kord/inject';
import { promiseHttpHandler } from '../core/http';
import { setDefaultSearchEngine } from '../core/search-engines';
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

import logger from './logger';
import telemetry from './telemetry';
import getConfig from './config';
import search from './search';
import getSnippet from './rich-header-snippet';
import addCustomSearchEngines from './search-engines/add-custom-search-engines';

import AdultAssistant from './assistants/adult';
import LocationAssistant from './assistants/location';
import * as offersAssistant from './assistants/offers';
import settingsAssistant from './assistants/settings';

/**
  @namespace search
  @module search
  @class Background
 */
export default background({
  requiresServices: ['search-services'],

  core: inject.module('core'),

  /**
    @method init
    @param settings
  */
  init() {
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
      instant: new Instant(),
      querySuggestions: new QuerySuggestions(),
      richHeader: new RichHeader(),
    };
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

      if (!this.searchSessions.has(sessionId)) {
        return;
      }

      const {
        telemetrySubscription,
        resultsSubscription,
        focusEventProxy,
      } = this.searchSessions.get(sessionId);

      focusEventProxy.next({ event: 'blur' });

      resultsSubscription.unsubscribe();
      telemetrySubscription.unsubscribe();

      this.searchSessions.delete(sessionId);
    },

    startSearch(
      query,
      { key: keyCode } = {}, { contextId, tab: { id: tabId } = {} } = { tab: {} }
    ) {
      const sessionId = tabId || contextId;

      if (this.searchSessions.has(sessionId)) {
        const queryEventProxy = this.searchSessions.get(sessionId).queryEventProxy;
        queryEventProxy.next({
          isPrivate: false,
          isTyped: true,
          query,
          tabId: sessionId,
          windowId: 1,
          keyCode,
          isPasted: false,
        });
        return;
      }

      const _config = getConfig({
        isPrivateMode: false,
      });

      const selectionEventProxy = new ObservableProxy();
      const queryEventProxy = new ObservableProxy();
      const focusEventProxy = new ObservableProxy();
      const highlightEventProxy = new ObservableProxy();

      const query$ = queryEventProxy.observable.share();
      const focus$ = focusEventProxy.observable.share();
      const selection$ = selectionEventProxy.observable.share();
      const highlight$ = highlightEventProxy.observable.share();

      const results$ = search(
        { query$, focus$, highlight$ },
        this.providers,
        _config,
      ).share();

      const telemetry$ = telemetry(focus$, query$, results$, selection$);
      const telemetrySubscription = telemetry$.subscribe(
        data => utils.telemetry(data, false, 'search.session'),
        error => logger.error('Failed preparing telemetry', error)
      );

      const resultsSubscription = results$.subscribe((results) => {
        const payload = {
          action: 'renderResults',
          args: [results],
        };
        if (tabId) {
          this.core.action(
            'broadcastMessageToWindow',
            payload,
            tabId,
          );
        } else {
          this.core.action(
            'broadcast',
            {
              ...payload,
              contextId,
            },
          );
          events.pub('search:results', { results });
        }
      });

      focusEventProxy.next({ event: 'focus' });

      queryEventProxy.next({
        isPrivate: false,
        isTyped: true,
        query,
        tabId: sessionId,
        windowId: 1,
        keyCode,
        isPasted: false,
      });

      this.searchSessions.set(sessionId, {
        focusEventProxy,
        queryEventProxy,
        highlightEventProxy,
        selectionEventProxy,
        telemetrySubscription,
        resultsSubscription,
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
      const url = config.settings.RICH_HEADER + getRichHeaderQueryString(
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

      const url = config.settings.RICH_HEADER + getRichHeaderQueryString(query) + params;
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

    adultAction(actionName) {
      if (this.adultAssistant.hasAction(actionName)) {
        return this.adultAssistant[actionName]();
      }
      return Promise.resolve();
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

    resetAssistantStates() {
      this.adultAssistant.resetAllowOnce();
      this.locationAssistant.resetAllowOnce();
    },
  },
});
