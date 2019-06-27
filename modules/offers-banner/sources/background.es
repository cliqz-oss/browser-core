import { chrome } from '../platform/globals';
import background from '../core/base/background';
import inject from '../core/kord/inject';
import { getActiveTab } from '../core/browser';
import prefs from '../core/prefs';
import { getMessage } from '../core/i18n';
import SearchReporter from './search/reporter';
import { dispatcher } from './transport/index';
import { transform, transformMany } from './transformation/index';
import { getOfferNotificationType } from './utils';
import Popup from './popup';

const REAL_ESTATE_IDS = ['browser-panel', 'offers-cc'];
const ALLOWED_PREFS = ['telemetry'];
const RED_DOT_TYPE = 'dot';

export default background({
  core: inject.module('core'),
  offersV2: inject.module('offers-v2'),
  requiresServices: ['logos', 'cliqz-config', 'telemetry'],

  init() {
    REAL_ESTATE_IDS.forEach(realEstateID =>
      this.offersV2
        .action('registerRealEstate', { realEstateID })
        .catch(() => {}));
    this.popup = new Popup({
      onPopupOpen: () => {
        this._setIconBadge('');
        this._closeBanner();
      },
      getOffers: this.actions.getOffers.bind(this),
    });
    this.popup.init();
    chrome.browserAction.enable();
    this.searchReporter = new SearchReporter(this.offersV2);
  },

  unload() {
    chrome.browserAction.disable();
    REAL_ESTATE_IDS.forEach(realEstateID =>
      this.offersV2
        .action('unregisterRealEstate', { realEstateID })
        .catch(() => {}));
    if (this.popup) {
      this.popup.unload();
      this.popup = null;
    }
    this.searchReporter = null;
  },

  beforeBrowserShutdown() { },
  actions: {
    send(type, offerId, msg, autoTrigger) {
      dispatcher(type, offerId, msg, autoTrigger);
    },

    getOffers(preferredOffer, banner = 'offers-cc') {
      const args = { filters: { by_rs_dest: banner } };
      return this.offersV2
        .action('getStoredOffers', args)
        .then(offers => transformMany(banner, { offers, preferredOffer }));
    },

    setPref(args) {
      if (!(ALLOWED_PREFS.includes(args.prefKey))) { return false; }
      prefs.set(args.prefKey, args.prefValue);
      return true;
    },

    getPref(args) {
      if (!(ALLOWED_PREFS.includes(args.prefKey))) { return undefined; }
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

      if (getOfferNotificationType(data) === RED_DOT_TYPE) {
        this._setIconBadge(RED_DOT_TYPE);
        return;
      }
      const [ok, payload] = transform(banner, data, { abtestPopupsType: true });
      if (ok) { this._renderBanner({ ...payload, autoTrigger: true }); }
    },
    'ui:click-on-url': function onSearchResultClick(results) {
      this.searchReporter.onSearchResultClick(results);
    },
    'search:session-end': function onSearchSessionEnd() {
      this.searchReporter.onSearchSessionEnd();
    },
    'search:results': function onSearchResults(results) {
      this.searchReporter.onSearchResults(results);
    },
  },

  async _renderBanner(data) { this._broadcastActionToActiveTab('renderBanner', data); },

  async _closeBanner() { this._broadcastActionToActiveTab('closeBanner'); },

  async _broadcastActionToActiveTab(action, data) {
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
      action,
      data
    );
  },

  _setIconBadge(type) {
    if (type === RED_DOT_TYPE) {
      const badgeText = getMessage('offers_badge_text_new');
      chrome.browserAction.setBadgeText({ text: badgeText });
      chrome.browserAction.setBadgeBackgroundColor({ color: 'rgb(255, 80, 55)' });
      chrome.browserAction.setBadgeTextColor({ color: 'white' });
    } else {
      chrome.browserAction.setBadgeText({ text: '' });
    }
  },
});
