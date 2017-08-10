import inject from '../core/kord/inject';
import background from '../core/base/background';
import utils from '../core/utils';
import console from '../core/console';
import events from '../core/events';

class OfferResult {
  constructor(rawResult) {
    this.rawResult = rawResult;
  }

  get isOffer() {
    return this.rawResult.data && this.rawResult.data.extra && this.rawResult.data.extra.is_ad;
  }

  get isHistory() {
    const kind = this.rawResult.data.kind || [''];
    return kind.some(k => k === 'H');
  }

  get shouldCountStats() {
    return this.isOffer && !this.isHistory;
  }

  get offerId() {
    return this.offerData.offer_id;
  }

  get offerData() {
    return this.rawResult.data.extra.offers_data.data;
  }
}

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  history: inject.module('history'),
  offers: inject.module('offers-v2'),

  /**
    @method init
    @param settings
  */
  init() {
    this.offerSignalSent = new WeakMap();
  },

  unload() {

  },

  getSessionCount(/* query */) {
    return 0; // this.history.action('getSessionCount', query);
  },

  beforeBrowserShutdown() {

  },

  sendOfferShownSignals(offerResult) {
    const offer = {
      origin: 'dropdown',
      data: offerResult.offerData,
    };
    return this.offers.action('createExternalOffer', offer).then(() => {
      if (this.offerSignalSent.get(this.currentResults)) {
        return Promise.resolve();
      }
      this.offerSignalSent.set(this.currentResults, true);
      events.pub('offers-recv-ch', {
        origin: 'dropdown',
        type: 'offer-action-signal',
        data: {
          offer_id: offerResult.offerId,
          action_id: 'offer_dsp_session'
        }
      });
      events.pub('offers-recv-ch', {
        origin: 'dropdown',
        type: 'offer-action-signal',
        data: {
          offer_id: offerResult.offerId,
          action_id: 'offer_shown'
        }
      });
      return Promise.resolve();
    }).catch(console.error);
  },

  get inOffersAB() {
    return utils.getPref('offersDropdownSwitch', false);
  },

  events: {
    'ui:click-on-url': function onClick({ rawResult }) {
      if (!this.inOffersAB) {
        return;
      }

      let showsPromise;

      // report shows if the query of currentResults matches
      if (this.currentResults && (rawResult.text === this.currentResults[0].text)) {
        const offersCreationPromises = this.currentResults
          .map(r => new OfferResult(r))
          .filter(r => r.shouldCountStats)
          .map(this.sendOfferShownSignals.bind(this));
        showsPromise = Promise.all(offersCreationPromises);
      } else {
        showsPromise = Promise.resolve();
      }

      const offerResult = new OfferResult(rawResult);

      if (!offerResult.shouldCountStats) {
        return;
      }

      showsPromise.then(() => {
        events.pub('offers-recv-ch', {
          origin: 'dropdown',
          type: 'offer-action-signal',
          data: {
            offer_id: offerResult.offerId,
            action_id: 'offer_ca_action'
          }
        });
      }, console.error);
    },

    'core:urlbar_blur': function onBlur() {
      if (!this.inOffersAB ||
          !this.currentResults ||
          this.offerSignalSent.get(this.currentResults)) {
        return;
      }
      this.currentResults
        .map(r => new OfferResult(r))
        .filter(r => r.shouldCountStats)
        .map(this.sendOfferShownSignals.bind(this));
    },

    'ui:results': function onResults(rawResults) {
      if (!this.inOffersAB) {
        return;
      }
      this.currentResults = rawResults;
      this.offerSignalSent.set(this.currentResults, false);
    },
  },

  actions: {

  }
});
