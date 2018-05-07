import Rx from '../platform/lib/rxjs';

import background from '../core/base/background';
import utils from '../core/utils';
import inject from '../core/kord/inject';
import { setDefaultSearchEngine } from '../core/search-engines';

// providers
import Calculator from './providers/calculator';
import Cliqz from './providers/cliqz';
import History from './providers/history';
import HistoryView from './providers/history-view';
import Instant from './providers/instant';
import QuerySuggestions from './providers/query-suggestions';
import RichHeader from './providers/rich-header';

import getConfig from './config';
import search from './search';
import getSnippet from './rich-header-snippet';
import addCustomSearchEngines from './search-engines/add-custom-search-engines';

/**
  @namespace search
  @module search
  @class Background
 */
export default background({
  core: inject.module('core'),

  /**
    @method init
    @param settings
  */
  init() {
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
      utils.setCountryIndex(country);
    },
  },

  actions: {
    startSearch(query, { tab: { id: tabId } } = { tab: {} }) {
      const config = getConfig({
        isPrivateMode: false,
      });

      const query$ = Rx.Observable.from([{
        isPrivate: false,
        isTyped: true,
        query,
        tabId,
        windowId: 1,
        keyCode: null,
        isPasted: false,
      }]);

      const focus$ = Rx.Observable.from([
        'focus',
      ]);

      const highlight$ = Rx.Observable.from([
      ]);

      const results$ = search(
        { query$, focus$, highlight$ },
        this.providers,
        config,
      ).share();

      results$.subscribe((results) => {
        const payload = {
          action: 'renderResults',
          args: [results],
        };
        this.core.action(
          'broadcastMessageToWindow',
          payload,
          tabId,
        );
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
      const url = utils.RICH_HEADER + utils.getRichHeaderQueryString(
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

    setDefaultSearchEngine(name) {
      return setDefaultSearchEngine(name);
    },
  },
});
