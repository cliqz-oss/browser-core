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

  },

  unload() {

  },

  getSessionCount(query) {
    return this.history.action('getSessionCount', query);
  },

  beforeBrowserShutdown() {

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
          .map((offerResult) => {
            const offer = {
              origin: 'dropdown',
              data: offerResult.offerData,
            };
            return this.offers.action('createExternalOffer', offer).then(() => {
              events.pub('offers-recv-ch', {
                origin: 'dropdown',
                type: 'offer-action-signal',
                data: {
                  offer_id: offerResult.offerId,
                  action_id: 'offer_shown'
                }
              });
            }).catch(console.error);
          });
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
    'ui:results': function onResults(rawResults) {
      if (!this.inOffersAB) {
        return;
      }

      this.currentResults = rawResults;
    },
  },

  actions: {

  }
});
