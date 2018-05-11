import background from '../core/base/background';

// providers
import Calculator from './providers/calculator';
import Cliqz from './providers/cliqz';
import History from './providers/history';
import Instant from './providers/instant';
import QuerySuggestions from './providers/query-suggestions';
import RichHeader from './providers/rich-header';

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
    this.providers = {
      calculator: new Calculator(),
      cliqz: new Cliqz(),
      history: new History(),
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
  },

  actions: {

  },
});
