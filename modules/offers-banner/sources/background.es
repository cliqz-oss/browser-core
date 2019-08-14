import { chrome } from '../platform/globals';
import background from '../core/base/background';
import inject from '../core/kord/inject';
import { getActiveTab } from '../core/browser';
import prefs from '../core/prefs';
import { findTabs } from '../core/tabs';
import { dispatcher as transportDispatcher } from './transport/index';
import { transform, transformMany } from './transformation/index';
import { getOfferNotificationType, products, chooseProduct } from './utils';
import { setIconBadge, resetIconBadge } from './icon-badge';
import Popup from './popup';
import SearchReporter from './search/reporter';

const REAL_ESTATE_IDS = ['browser-panel', 'offers-cc', 'offers-reminder'];
const ALLOWED_PREFS = ['telemetry', 'humanWebOptOut'];
const RED_DOT_TYPE = 'dot';
const SILENT_TYPE = 'silent';

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
        resetIconBadge();
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
      transportDispatcher(type, offerId, msg, autoTrigger);
    },

    async getOffers(preferredOffer, banner = 'offers-cc') {
      const args = { filters: { by_rs_dest: banner } };
      const tab = await getActiveTab();
      const offers = await this.offersV2.action('getStoredOffers', args, tab ? tab.url : undefined);
      return transformMany(banner, { offers, preferredOffer });
    },

    setPref(preferences = {}) {
      if (!Object.keys(preferences).every(pref => ALLOWED_PREFS.includes(pref))) { return; }
      Object.keys(preferences).forEach(pref => prefs.set(pref, preferences[pref]));
    },

    getPref(preferences = []) {
      if (!preferences.every(pref => ALLOWED_PREFS.includes(pref))) { return {}; }
      const obj = {};
      // default pref for telemetry is true, for others prefs let's assume false
      preferences.forEach((pref) => {
        obj[pref] = prefs.get(pref, pref === 'telemetry');
      });
      return obj;
    }
  },

  events: {
    'offers-send-ch': function onMessage(msg) {
      if (!msg) { return; }
      const { dest = [], type = '', data } = msg;
      if (type !== 'push-offer' || !data) { return; }
      const banner = REAL_ESTATE_IDS.find(estate => dest.includes(estate));
      if (banner) { this._dispatcher(banner, data); }
    },
    'offers-notification:unreaded-offers-count': function onMessage({ count, tabId }) {
      if (tabId !== undefined) { setIconBadge(chooseProduct(products()), { tabId, count }); }
    },

    // dropdown
    'ui:click-on-url': function onSearchResultClick(results) {
      this.searchReporter.onSearchResultClick(results);
    },
    'search:session-end': function onSearchSessionEnd() {
      this.searchReporter.onSearchSessionEnd();
    },
    'search:results': function onSearchResults(results) {
      this.searchReporter.onSearchResults(results);
    },
    // dropdown end
  },

  _dispatcher(banner, data) {
    const notificationType = getOfferNotificationType(data);
    if (notificationType === SILENT_TYPE) { return; }

    if (notificationType === RED_DOT_TYPE) {
      setIconBadge(chooseProduct(products()));
      return;
    }
    const { display_rule: { url } = {} } = data;
    const exactMatch = banner === 'offers-reminder';
    const [ok, payload] = transform(banner, data, { abtestPopupsType: true });
    if (ok) { this._renderBanner({ ...payload, autoTrigger: true }, { url, exactMatch }); }
  },

  async _renderBanner(data, { url, exactMatch }) {
    this._broadcastActionToTab('renderBanner', data, { activeTab: false, url, exactMatch });
  },

  async _closeBanner() {
    this._broadcastActionToTab('closeBanner');
  },

  async _broadcastActionToTab(action, data, { activeTab = true, url, exactMatch = false } = {}) {
    /*
      We trying to find a tab by `url` (and push the data),
      if not we fallback to activeTab.
      If client provides:
        `exactMatch` -- we do not fallback to activeTab,
        `activeTab` -- we do not try to find a tab by url
    */
    const isUrlEmpty = !url || url.length === 0; // types of url: string | [string]
    const tabs = (activeTab || isUrlEmpty) ? [] : await findTabs(url);
    if (tabs.length === 0 && exactMatch) { return; }
    const tab = tabs.length === 0 ? await getActiveTab() : tabs.pop();
    this.core.action(
      'broadcastActionToWindow',
      tab.id,
      'offers-banner',
      action,
      data
    );
  },
});
