import background from '../core/base/background';
import utils from '../core/utils';
import Storage from '../core/storage';
import prefs from '../core/prefs';
import { getDefaultEngine } from '../core/search-engines';

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {
    this.supportABtest = setTimeout(() => {
      this.storage = new Storage('https://suchen.cliqz.com');
      this.storage.setItem('serp_test', prefs.get('serp_test', null));

      this.sendSERPtelemetry(this);
    }, 5 * 1000);
  },

  unload() {
    clearTimeout(this.supportABtest);
  },

  sendSERPtelemetry() {
    const group = prefs.get('serp_test', null);
    const serpAlternativeSearchEngine = (this.storage.getItem('alternative-search-engine') || 'Google').toLowerCase();
    const isCliqzDefaultEngine = getDefaultEngine().name === 'Cliqz';
    utils.telemetry({ group, isCliqzDefaultEngine, serpAlternativeSearchEngine },
      false, 'metrics.experiments.serp.state');

    // resend after 24h
    this.supportABtest = setTimeout(this.sendSERPtelemetry.bind(this), 24 * 60 * 60 * 1000);
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  },
});
