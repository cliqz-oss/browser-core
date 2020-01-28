import { chrome } from '../platform/globals';
import background from '../core/base/background';
import inject from '../core/kord/inject';
import { getActiveTab } from '../core/browser';
import { isGhostery } from '../core/platform';
import prefs from '../core/prefs';
import { findTabs } from '../core/tabs';
import telemetry from '../core/services/telemetry';
import { dispatcher as transportDispatcher } from './transport/index';
import { transform, transformMany } from './transformation/index';
import { getOfferNotificationType, products, chooseProduct } from './utils';
import { setIconBadge, resetIconBadge } from './icon-badge';
import Popup from './popup';
import SearchReporter from './search/reporter';
import logger from './logger';
import metrics from './telemetry/metrics';

const REAL_ESTATE_IDS = [
  'browser-panel',
  'offers-cc',
  'offers-reminder',
  'offers-checkout',
  'ghostery',
];
const ALLOWED_PREFS = ['telemetry', 'humanWebOptOut'];
const RED_DOT_TYPE = 'dot';
const GHOSTERY_RED_DOT_TYPE = 'star';
const SILENT_TYPE = 'silent';

export default background({
  core: inject.module('core'),
  offersV2: inject.module('offers-v2'),
  requiresServices: ['logos', 'cliqz-config', 'telemetry'],

  init() {
    telemetry.register(metrics);
    REAL_ESTATE_IDS.forEach(realEstateID =>
      this.offersV2
        .action('registerRealEstate', { realEstateID })
        .catch(() => {}));
    this.popup = new Popup({
      onPopupOpen: () => {
        if (isGhostery) { return; }
        resetIconBadge();
        this._closeBanner();
      },
      getOffers: this.actions.getOffers.bind(this),
    });
    this.popup.init();
    if (!isGhostery) { chrome.browserAction.enable(); }
    this.searchReporter = new SearchReporter(this.offersV2);
    this._renderBannerIf = this._renderBannerIf.bind(this);
  },

  unload() {
    telemetry.unregister(metrics);
    if (!isGhostery) { chrome.browserAction.disable(); }
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

  actions: {
    send(type, offerId, msg, autoTrigger) {
      transportDispatcher(type, offerId, msg, autoTrigger);
    },

    async getOffers(banner = 'offers-cc') {
      const filters = { filters: { by_rs_dest: banner } };
      const tab = await getActiveTab().catch(() => undefined);
      const url = tab ? tab.url : undefined;
      const offers = await this.offersV2.action('getStoredOffers', filters, url);
      return transformMany(banner, { offers });
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
    'offers-notification:unread-offers-count': function onMessage({ count, tabId }) {
      if (tabId !== undefined && !isGhostery) {
        setIconBadge(chooseProduct(products()), { tabId, count });
      }
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
    const rendererMapper = {
      [SILENT_TYPE]: () => {},
      [GHOSTERY_RED_DOT_TYPE]: () => {},
      [RED_DOT_TYPE]: () => !isGhostery && setIconBadge(chooseProduct(products())),
    };
    (rendererMapper[notificationType] || this._renderBannerIf)(banner, data);
  },

  _renderBannerIf(banner, data) {
    const { display_rule: { url } = {} } = data;
    const exactMatch = ['offers-reminder', 'offers-checkout'].includes(banner);
    const [ok, payload] = transform(banner, data);
    if (ok) { this._renderBanner({ ...payload, autoTrigger: true }, { url, exactMatch }); }
  },

  async _renderBanner(data, { url, exactMatch }) {
    const tab = await this._getTab({ activeTabOnly: false, url, exactMatch });
    this._broadcastActionToTabGuarded('renderBanner', data, tab);
  },

  async _closeBanner() {
    const tab = await this._getTab({ activeTabOnly: true, exactMatch: false });
    this._broadcastActionToTabGuarded('closeBanner', {}, tab, { blacklist: false });
  },

  async _broadcastActionToTabGuarded(action, data, tab, { blacklist = true } = {}) {
    if (!tab || !tab.url) { return; }
    if (tab.activeUsed && blacklist && await this._checkBlacklist(data.offerId, tab.url)) {
      logger.info('offer blacklisted on url:', tab.url);
      return;
    }
    this._broadcastActionToTab(action, data, tab);
  },

  async _broadcastActionToTab(action, data, tab = {}) {
    this.core.action(
      'callContentAction',
      'offers-banner',
      action,
      { windowId: tab.id },
      data
    );
  },

  async _getTab({ activeTabOnly = true, url, exactMatch = false } = {}) {
    /*
      We trying to find a tab by `url`, if not we fallback to activeTab.
      If client provides:
        `exactMatch` -- we do not fallback to activeTab,
        `activeTabOnly` -- we do not try to find a tab by url.
    */
    const isUrlEmpty = !url || url.length === 0; // type of url: string | [string]
    const tabs = (activeTabOnly || isUrlEmpty) ? [] : await findTabs(url);
    if (tabs.length !== 0) { return tabs.pop(); }
    if (exactMatch) { return undefined; }
    const tab = await getActiveTab().catch(() => undefined);
    return tab ? { ...tab, activeUsed: true } : undefined;
  },

  async _checkBlacklist(offerId, url) {
    const global = await this.offersV2.action('isUrlBlacklisted', url);
    return global || this.offersV2.action('isUrlBlacklistedForOffer', offerId, url);
  },
});
