import inject from '../core/kord/inject';
import background from '../core/base/background';
import prefs from '../core/prefs';
import OffersReporter from './telemetry/offers';

/**
  @namespace dropdown
  @module dropdown
  @class Background
 */
export default background({
  history: inject.module('history'),
  offers: inject.module('offers-v2'),

  requiresServices: ['logos'],

  /**
    @method init
    @param settings
  */
  init() {
    this.offersReporter = new OffersReporter(this.offers);
  },

  unload() {

  },

  getSessionCount(/* query */) {
    return 0; // this.history.action('getSessionCount', query);
  },

  beforeBrowserShutdown() {

  },

  get inOffersAB() {
    return prefs.get('offers2UserEnabled', true);
  },

  events: {
    'ui:click-on-url': async function onClick({ rawResult }) {
      if (!this.inOffersAB) {
        return;
      }

      if (
        this.currentResults
        && (rawResult.text === this.currentResults[0].text)
      ) {
        await this.offersReporter.reportShows(this.currentResults);
      }

      this.offersReporter.reportClick(this.currentResults, rawResult);
    },

    'search:session-end': function onBlur() {
      if (
        !this.inOffersAB
        || !this.currentResults
      ) {
        return;
      }

      this.offersReporter.reportShows(this.currentResults);
    },

    'search:results': function onResults({ results }) {
      if (!this.inOffersAB) {
        return;
      }

      this.currentResults = results;
      this.offersReporter.registerResults(results);
    },
  },

  actions: {

  }
});
