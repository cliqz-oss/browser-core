import background from '../core/base/background';
import inject from '../core/kord/inject';
import { getActiveTab } from '../core/browser';
import { dispatcher } from './transport/index';
import { transform, transformMany } from './transformation/index';
import prefs from '../core/prefs';
import { toggleApp } from './utils';

const REAL_ESTATE_IDS = ['browser-panel', 'offers-cc'];
const ALLOWED_PREFS = ['telemetry'];

export default background({
  core: inject.module('core'),
  offersV2: inject.module('offers-v2'),
  requiresServices: ['logos', 'cliqz-config'],

  init() {
    REAL_ESTATE_IDS.forEach(realEstateID =>
      this.offersV2
        .action('registerRealEstate', { realEstateID })
        .catch(() => {}));
  },
  unload() {
    REAL_ESTATE_IDS.forEach(realEstateID =>
      this.offersV2
        .action('unregisterRealEstate', { realEstateID })
        .catch(() => {}));
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
    toggleApp(data) {
      return toggleApp(data);
    },
    setPref(args) {
      if (!(ALLOWED_PREFS.includes(args.prefKey))) {
        return false;
      }
      prefs.set(args.prefKey, args.prefValue);
      return true;
    },
    getPref(args) {
      if (!(ALLOWED_PREFS.includes(args.prefKey))) {
        return undefined;
      }
      return prefs.get(args.prefKey, true);
    }
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
    this.core.action(
      'broadcastActionToWindow',
      tab.id,
      'offers-banner',
      'renderBanner',
      data
    );
  },
});
