import background from '../core/base/background';
import utils from '../core/utils';

// providers
import Calculator from './providers/calculator';
import Cliqz from './providers/cliqz';
import History from './providers/history';
import HistoryView from './providers/history-view';
import Instant from './providers/instant';
import QuerySuggestions from './providers/query-suggestions';
import RichHeader from './providers/rich-header';
import getSnippet from './rich-header-snippet';
import { setDefaultSearchEngine } from '../core/search-engines';
import addCustomSearchEngines from './search-engines/add-custom-search-engines';

/**
  @namespace search
  @module search
  @class Background
 */
export default background({
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
    'control-center:setDefault-indexCountry': function setDefaultIndexCountry(country) {
      utils.setDefaultIndexCountry(country);
    },
  },

  actions: {
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
