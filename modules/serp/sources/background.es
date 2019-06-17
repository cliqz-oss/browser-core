import background from '../core/base/background';
import telemetry from '../core/services/telemetry';
import Storage from '../core/storage';
import prefs from '../core/prefs';
import { getDefaultEngine } from '../core/search-engines';
import { setTimeout } from '../core/timers';

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  requiresServices: ['telemetry'],

  /**
    @method init
    @param settings
  */
  init() {
    this.supportABtest = setTimeout(() => {
      this.storage = new Storage('https://suchen.cliqz.com');
      this.storage.setItem('serp_test', prefs.get('serp_test', null));
      this.storage.setItem('experiments.serp', prefs.get('experiments.serp', null));

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
    telemetry.push(
      { group, isCliqzDefaultEngine, serpAlternativeSearchEngine },
      'metrics.experiments.serp.state',
    );

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
