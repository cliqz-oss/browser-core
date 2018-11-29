import background from '../core/base/background';
import inject from '../core/kord/inject';
import { getActiveTab } from '../core/browser';
import { dispatcher } from './transport/index';
import { transform, transformMany } from './transformation/index';
import { chrome } from '../platform/globals';
import config from '../core/config';

const REAL_ESTATE_IDS = ['browser-panel', 'offers-cc'];

export default background({
  core: inject.module('core'),
  offersV2: inject.module('offers-v2'),
  requiresServices: ['logos', 'cliqz-config'],

  init() {
    REAL_ESTATE_IDS.forEach(realEstateID =>
      this.offersV2
        .action('registerRealEstate', { realEstateID })
        .catch(() => {}));
    if (config.settings.OFFERS_BUTTON) {
      chrome.browserAction.onClicked.addListener(this.actions.showOffers);
    }
  },
  unload() {
    REAL_ESTATE_IDS.forEach(realEstateID =>
      this.offersV2
        .action('unregisterRealEstate', { realEstateID })
        .catch(() => {}));
    if (config.settings.OFFERS_BUTTON) {
      chrome.browserAction.onClicked.removeListener(this.actions.showOffers);
    }
  },
  beforeBrowserShutdown() { },
  actions: {
    send(type, offerId, msg, autoTrigger) {
      dispatcher(type, offerId, msg, autoTrigger);
    },
    showOffers(preferredOffer, banner = 'offers-cc') {
      const args = { filters: { by_rs_dest: banner } };
      return this.offersV2
        .action('getStoredOffers', args)
        .then((offers) => {
          const payload = transformMany(banner, { offers, preferredOffer });
          this._renderBanner({ ...payload, autoTrigger: false });
        });
    },
  },

  events: {
    'offers-send-ch': function onMessage(msg) {
      if (!msg) { return; }
      const { dest = [], type = '', data } = msg;
      if (type !== 'push-offer' || !data) { return; }
      const banner = REAL_ESTATE_IDS.find(estate => dest.includes(estate));
      if (!banner) { return; }

      const [ok, payload] = transform(banner, data);
      if (ok) { this._renderBanner({ ...payload, autoTrigger: true }); }
    },
  },

  async _renderBanner(data) {
    /*
      Between event `content:change` in offers-v2 and event `offers-send-ch`
      in this module exist complex business-logic, so it's not very easy
      to send data about tab. Also exists other module which can trigger offer
      without passing info about tab.id
    */
    const tab = await getActiveTab();

    /*
      We have a timing issue. We are sending the message,
      but contentScript is not ready yet. For firefox is not
      a issue, but for Chrome is.  This should be fixed in the core,
      meanwhile lets give our users additional tick.
    */
    setTimeout(() => this.core.action(
      'broadcastActionToWindow',
      tab.id,
      'offers-banner',
      'renderBanner',
      data
    ), 0);
  },
});
