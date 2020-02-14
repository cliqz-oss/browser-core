/* eslint object-curly-spacing: off */

/**
 * @module offers-v2
 * @main offers-v2
 */
import { chrome } from '../platform/globals';
import inject from '../core/kord/inject';
import { getGeneralDomain, extractHostname } from '../core/tlds';
import prefs from '../core/prefs';
import config from '../core/config';
import events from '../core/events';
import pacemaker from '../core/services/pacemaker';
import { isCliqzBrowser } from '../core/platform';
import background from '../core/base/background';
import Database from '../core/database-migrate';
import EventEmitter from '../core/event-emitter';
import md5 from '../core/helpers/md5';

import OffersHandler from './offers/offers-handler';
import Offer from './offers/offer';
import ActionID from './offers/actions-defs';
import OfferDB from './offers/offers-db';
import IntentHandler from './intent/intent-handler';
import Intent from './intent/intent';
import CategoryHandler from './categories/category-handler';
import CategoryFetcher from './categories/category-fetcher';
import SignalHandler from './signals/signals_handler';
import TriggerMachineExecutor from './trigger_machine/trigger_machine_executor';
import FeatureHandler from './features/feature-handler';
import logger from './common/offers_v2_logger';
import UrlData from './common/url_data';
import { LANDING_MONITOR_TYPE } from './common/constant';
import BEConnector from './backend-connector';
import JourneyHandler from './user-journey/journey-handler';
import CouponHandler from './coupon/coupon-handler';
import OffersConfigs from './offers_configs';
import EventHandler from './event_handler';
import ShopReminder from './shop_reminder';
import patternsStatMigrationCheck from './patterns_stat_migration_check';
import { PatternsStat } from './patterns_stat';
import ChipdeHandler from './whitelabel/chipde/handler';

// /////////////////////////////////////////////////////////////////////////////
// consts
const DEBUG_DEXIE_MIGRATION = false;

// If the offers are toggled on/off, the real estate modules should
// be activated or deactivated.
function touchManagedRealEstateModules(isEnabled) {
  const managedRealEstateModules = ['offers-banner', 'myoffrz-helper'];
  managedRealEstateModules.forEach(moduleName =>
    prefs.set(`modules.${moduleName}.enabled`, isEnabled));
}

/**
 * @class Background
 */
export default background({
  // to be able to read the config prefs
  requiresServices: ['cliqz-config', 'telemetry', 'pacemaker'],
  core: inject.module('core'),
  helper: inject.module('myoffrz-helper'),
  hpnv2: inject.module('hpnv2'),

  // Support the constraint for managed real estate modules:
  // - if a module is initialized, it is in "registeredRealEstates"
  // - if a module is unloaded, it is not in "registeredRealEstates"
  //
  // Retain the list of real estates even if the offers are toggled on
  // and off (handled by functions "softInit" and "softUnload"). Reason
  // is that some real estates might be permanent and register themselves
  // only once on startup.
  async init() {
    if (!this.registeredRealEstates) {
      this.registeredRealEstates = new Map();
    }

    await this.softInit();
  },

  async unload() { // called as it were a sync function
    await this.softUnload();
    this.registeredRealEstates = null;
  },

  // ////////
  async softInit() {
    // check if we need to do something or not
    if (!prefs.get('offers2UserEnabled', true)) {
      this.initialized = false;
      if (isCliqzBrowser) { chrome.browserAction.disable(); }
      return;
    }

    if (DEBUG_DEXIE_MIGRATION) {
      this.patternsStatMigrationCheck = patternsStatMigrationCheck;
    }

    // set some extra variables
    if (prefs.get('offersTelemetryFreq')) {
      OffersConfigs.SIGNALS_OFFERS_FREQ_SECS = prefs.get('offersTelemetryFreq');
    }
    if (prefs.get('offersOverrideTimeout')) {
      OffersConfigs.OFFERS_OVERRIDE_TIMEOUT = prefs.get('offersOverrideTimeout');
    }
    logger.info(`\n\n
      ------------------------------------------------------------------------
                                  NEW SESSION STARTED
      Version: ${OffersConfigs.CURRENT_VERSION}
      timestamp: ${Date.now()}
      OffersConfigs.LOG_LEVEL: ${OffersConfigs.LOG_LEVEL}
      developer: ${prefs.get('developer', false)}
      triggersBE: ${OffersConfigs.BACKEND_URL}
      offersTelemetryFreq: ${OffersConfigs.SIGNALS_OFFERS_FREQ_SECS}
      '------------------------------------------------------------------------\n`);

    this.dropdownOfferData = null;
    this.purchaseCache = new Set();
    // create the DB to be used over all offers module
    this.db = new Database('cliqz-offers');
    await this.db.init();

    // OffersDB
    this.offersDB = new OfferDB();
    await this.offersDB.loadPersistentData();

    // the backend connector
    this.backendConnector = new BEConnector();

    // create the event handler
    this.eventHandler = new EventHandler();

    this.onUrlChange = this.onUrlChange.bind(this);
    this.eventHandler.subscribeUrlChange(this.onUrlChange);

    this.signalReEmitter = new EventEmitter();

    // campaign signals with match patterns
    this.patternsStat = new PatternsStat(
      offerID => this.offersDB.getReasonForHaving(offerID),
      this.signalReEmitter
    );
    await this.patternsStat.init(this.db);

    const isUserJourneyEnabled = config.settings['offers.user-journey.enabled'];
    if (isUserJourneyEnabled) {
      this.journeyHandler = new JourneyHandler({
        eventHandler: this.eventHandler,
        signalReEmitter: this.signalReEmitter,
      });
      await this.journeyHandler.init();
    } else {
      this.journeyHandler = null;
    }

    // campaign signals
    this.signalsHandler = new SignalHandler({
      db: this.db,
      patternsStat: this.patternsStat,
      journeySignals: this.journeyHandler && this.journeyHandler.getSignalHandler(),
      signalReEmitter: this.signalReEmitter,
      trustedClock: {
        getMinutesSinceEpochAsync: async () => {
          const time = await this.hpnv2.action('getTime');
          return time.minutesSinceEpoch;
        }
      },
    });
    await this.signalsHandler.init();

    // init the features here
    this.featureHandler = new FeatureHandler();
    const historyFeature = this.featureHandler.getFeature('history');

    // intent system
    this.intentHandler = new IntentHandler();
    await this.intentHandler.init();

    // category system
    this.categoryHandler = new CategoryHandler(historyFeature);
    await this.categoryHandler.init(this.db);
    await this.categoryHandler.loadPersistentData();

    // load the data from the category handler and the fetcher
    this.categoryFetcher = new CategoryFetcher(
      this.backendConnector,
      this.categoryHandler,
      this.db
    );
    await this.categoryFetcher.init();

    if (config.settings.OFFERS_BRAND === 'chip') {
      this.chipdeHandler = new ChipdeHandler(
        this.db,
        this.eventHandler.getWebrequestPipeline()
      );
      await this.chipdeHandler.init();
    }

    // offers handling system
    this.offersHandler = new OffersHandler({
      intentHandler: this.intentHandler,
      backendConnector: this.backendConnector,
      presentRealEstates: this.registeredRealEstates,
      featuresHandler: this.featureHandler,
      sigHandler: this.signalsHandler,
      eventHandler: this.eventHandler,
      categoryHandler: this.categoryHandler,
      offersDB: this.offersDB,
      chipdeHandler: this.chipdeHandler,
    });
    await this.offersHandler.init();
    //
    this.offersAPI = this.offersHandler.offersAPI;

    this.shopReminder = new ShopReminder({ db: this.db });
    await this.shopReminder.init();

    this.couponHandler = new CouponHandler({
      offersHandler: this.offersHandler,
      core: this.core,
      offersDB: this.offersDB,
    });

    // create the trigger machine executor
    this.globObjects = {
      db: this.db,
      feature_handler: this.featureHandler,
      intent_handler: this.intentHandler,
      be_connector: this.backendConnector,
      category_handler: this.categoryHandler,
      offers_status_handler: this.offersHandler.offerStatus,
      telemetry: inject.service('telemetry', ['push']),
    };
    this.triggerMachineExecutor = new TriggerMachineExecutor(this.globObjects);

    if (prefs.get('offers2UserEnabled', true) && isCliqzBrowser) {
      chrome.browserAction.enable();
    }

    this.initialized = true;

    // Module initialization should be fast because the whole extension
    // waits for it. Therefore, heavy initialization (for example,
    // loading categories from the backend) should be postponed.
    // There is nothing special in 5 seconds, it is just a guess.
    const postInitDelayMs = 1000 * 5;
    this.postInitTimer = pacemaker.setTimeout(
      this.postInit.bind(this),
      postInitDelayMs
    );
  },

  async postInit() {
    this.cancelPostInit(); // if called directly, cancel scheduled call
    await this.categoryFetcher.postInit();
  },

  cancelPostInit() {
    if (this.postInitTimer) {
      pacemaker.clearTimeout(this.postInitTimer);
      this.postInitTimer = null;
    }
  },

  // ///////////////////////////////////////////////////////////////////////////
  async softUnload() {
    if (this.initialized === false) {
      return;
    }

    this.cancelPostInit();

    if (this.triggerMachineExecutor) {
      await this.triggerMachineExecutor.destroy();
      this.triggerMachineExecutor = null;
    }

    if (this.globObjects) {
      this.globObjects = null;
    }
    this.couponHandler = null;
    if (this.shopReminder) {
      this.shopReminder.unload();
      this.shopReminder = null;
    }
    if (this.signalsHandler) {
      await this.signalsHandler.destroy();
      this.signalsHandler = null;
    }
    if (this.patternsStat) {
      await this.patternsStat.destroy();
      this.patternsStat = null;
    }
    this.signalReEmitter = null;
    if (this.eventHandler) {
      await this.eventHandler.destroy();
      this.eventHandler = null;
    }
    if (this.featureHandler) {
      await this.featureHandler.unload();
      this.featureHandler = null;
    }
    if (this.offersHandler) {
      await this.offersHandler.destroy();
      this.offersHandler = null;
    }
    if (this.chipdeHandler) {
      this.chipdeHandler.unload();
      this.chipdeHandler = null;
    }

    this.intentHandler = null;

    if (this.journeyHandler) {
      await this.journeyHandler.destroy();
      this.journeyHandler = null;
    }

    if (this.categoryFetcher) {
      await this.categoryFetcher.unload();
      this.categoryFetcher = null;
    }
    if (this.categoryHandler) {
      this.categoryHandler.destroy();
      this.categoryHandler = null;
    }

    this.offersDB = null;
    this.initialized = false;
  },

  // ///////////////////////////////////////////////////////////////////////////
  start() {
    // nothing to do
  },

  status() {
    return {
      visible: true,
      userEnabled: prefs.get('offers2UserEnabled', true) === true,
      locationEnabled: true,
    };
  },

  /**
   * @nethod onCategoriesHit
   * @param {CategoriesMatchTraits} matches
   * @param {UrlData} urlData updated with `matches`
   */
  onCategoriesHit(matches, urlData) {
    urlData.setCategoriesMatchTraits(matches);
    // process the trigger engine now
    // We want to have the following behavior to be able to show offers on
    // the same url change:
    // - trigger machine
    // - fetch intents
    // - process offers (handler)
    //
    // Since fetch intents is now in offers handler this is enough
    this.triggerMachineExecutor.processUrlChange({ url_data: urlData })
      .then(() => this.offersHandler.urlChangedEvent(urlData, matches));
  },

  /**
   * Called from `EventHandler`, which listen for location change events
   * and tokenizes the current url.
   *
   * @method onUrlChange
   * @param {UrlData} urlData
   */
  onUrlChange(urlData) {
    if (!urlData || !this.triggerMachineExecutor) {
      return;
    }

    // evaluate categories first and store in the urlData all the categories
    // activated for that given url
    const matches = this.categoryHandler.newUrlEvent(urlData.getPatternRequest());
    if (matches.matches.size > 0) {
      logger.debug('Categories hit', [...matches.getCategoriesIDs()]);
    }
    this.onCategoriesHit(matches, urlData);
    this.onCategoryHitByFakeUrlIfNeeded(urlData);
  },


  /**
   * Method used to set some internal preferences / flags for easy debugging / testing
   * and configuration
   * In the future we will use this method to configure offers using the general
   * configuration (in runtime) at module level
   */
  configureFlags(flags) {
    // the list of acceptable normal preferences
    const validPrefNames = new Set([
      'offers2UserEnabled',
      'offersLogsEnabled',
      'offersLoadSignalsFromDB',
      'offersSaveStorage',
      'triggersBE',
      'offersTelemetryFreq',
      'offersOverrideTimeout',
      'showConsoleLogs',
      'offersInstallInfo',
      'developer',
      'config_location',
    ]);

    Object.keys(flags).forEach((prefName) => {
      const prefValue = flags[prefName];
      if (validPrefNames.has(prefName)) {
        // we can set this one
        logger.debug(`Setting offers pref ${prefName} with value: ${prefValue}`);

        // check if it is a normal pref or a particular
        switch (prefName) {
          case 'offersInstallInfo':
            prefs.set(prefName, `${inject.app.version}|${prefValue}`);
            break;
          default:
            prefs.set(prefName, prefValue);
        }
      } else {
        logger.debug(`The offers pref with name ${prefName} is not valid in offers`);
      }
    });
  },

  /**
   * Proxy method to know if we should inject the coupon detection script in
   * this url or not.
   * In case we should activate the script we will return an object as follow:
   * {
   *   // the url where should be activated, basically the same we passed as param
   *   url,
   *   // the offerInfo structure
   *   offerInfo: {
   *     monitorID: 'xyz', // the monitor ID
   *     code: 'xyz', // the coupon code of the offer (to inject it)
   *   },
   *   // confirming we want to activate it
   *   activate: true,
   * }
   */
  _shouldActivateOfferForUrl(url) {
    if (this.offersHandler) {
      const urlData = new UrlData(url);
      const result = this.offersHandler.shouldActivateOfferForUrl(urlData)
        || { activate: false };
      return { ...result, url, module: 'offers-v2' };
    }
    return { url, activate: false, module: 'offers-v2' };
  },

  _publishOfferReminderPushEventIfNeeded(url = '', detectOfferReminder = {}) {
    const { active = false, offerID: offerId, description = '' } = detectOfferReminder;
    const domain = extractHostname(url); // by design
    if (active && domain) { this.shopReminder.add(domain, offerId, description); }
    const [ok, notification] = this.shopReminder.notification(domain);
    if (!ok) { return; }
    if (notification.state === 'new') {
      // to make sure that client receive in state 'new' only once
      this.shopReminder.receive(domain, 'minimize');
    }
    this._publishOfferReminderPushEvent({
      offerId: notification.offerId,
      domain,
      notification,
      url,
    });
  },

  _publishOfferReminderPushEvent({ offerId, domain, notification, url: currentUrl }) {
    const offer = this.offersHandler.getOfferObject(offerId);
    const meta = this.offersDB.getOfferMeta(offerId);
    if (!offer || meta.removed) { return; }
    const { ui_info: { template_data: templateData } = {} } = offer;
    if (!templateData) { return; }
    const isCodeHidden = this.offersDB.getOfferAttribute(offerId, 'isCodeHidden') || false;
    const { call_to_action: { url: ctaurl = '' } = {} } = templateData;
    const voucher = {
      description: notification.description,
      benefit: templateData.benefit,
      code: templateData.code,
      logo: templateData.logo_dataurl,
      logoClass: templateData.logo_class,
      isCodeHidden,
      offerId,
      landing: new Offer(offer).getMonitorPatterns(LANDING_MONITOR_TYPE),
      ctaurl,
    };
    const { rule_info: { url = [] } = {} } = offer;
    const newUrl = url && url.length !== 0 ? url : currentUrl;
    const data = { state: notification.state, voucher, domain, display_rule: { url: newUrl } };
    const payload = { dest: ['offers-reminder'], type: 'push-offer', data };
    events.pub('offers-send-ch', payload);
  },

  _categoryHitByFakeUrl({fakeUrl}) {
    const fakeUrlData = new UrlData(fakeUrl);
    const matches = this.categoryHandler.newUrlEvent(fakeUrlData.getPatternRequest());
    if (matches.matches.size > 0) {
      logger.log('Matching categories by fake url:', matches.getCategoriesIDs(), fakeUrl);
      this.onCategoriesHit(matches, fakeUrlData);
    }
  },

  _notifyClientsIfNeeded(url) {
    const monitorCheck = this._shouldActivateOfferForUrl(url) || {};
    const isPopNotShown = this.couponHandler && this.couponHandler.onDomReady(monitorCheck);
    if (!isPopNotShown && this.shopReminder) {
      this._publishOfferReminderPushEventIfNeeded(url, monitorCheck.detectOfferReminder || {});
    }
  },

  onCategoryHitByFakeUrlIfNeeded(urlData) {
    if (!this.dropdownOfferData) { return; }
    const {fakeUrl, ctaUrl} = this.dropdownOfferData;
    const ctaUrlData = new UrlData(ctaUrl);
    const normalizedCtaUrl = ctaUrlData.getNormalizedUrl();
    const {query: ctaQuery = ''} = ctaUrlData.getUrlDetails();
    const {cleanHost, path} = urlData.getUrlDetails();
    if (normalizedCtaUrl === urlData.getNormalizedUrl()
      || decodeURIComponent(ctaQuery).includes(cleanHost + path)) { // affiliated network
      this.dropdownOfferData = null;
      this._categoryHitByFakeUrl({ fakeUrl });
    }
  },

  // ///////////////////////////////////////////////////////////////////////////
  events: {
    'offers-recv-ch': function onRealEstateMessage(message) {
      if (this.offersAPI) {
        this.offersAPI.processRealEstateMessage(message);
      }
    },
    prefchange: async function onPrefChange(pref) {
      if (pref !== 'offers2UserEnabled') { return; }
      const offers2UserEnabled = prefs.get('offers2UserEnabled', true);
      if (offers2UserEnabled) {
        await this.softInit();
        touchManagedRealEstateModules(true);
      } else {
        // The next two unload processes run at the same time,
        // beware of race conditions
        touchManagedRealEstateModules(false);
        await this.softUnload();
      }
    },
    // we need it here because we want listen events on page reload too
    // for comparison see please event_handler
    'content:location-change': function onLocationChange(tab) {
      // for winning the last click with pinned tab
      if (tab.pinned && !tab.active) { return; }
      if (tab.url) { this._notifyClientsIfNeeded(tab.url); }
    },
    'offers-reminder-recv-ch': function onOffersReminderReceive(msg) {
      const { origin, data: { action = '', domain = '' } = {} } = msg;
      if (origin !== 'offers-reminder') { return; }
      this.shopReminder.receive(domain, action);
    },
    'offers-checkout-recv-ch': function onOffersCheckoutReceive(msg) {
      const { origin, data = {}, type } = msg;
      if (origin !== 'offers-checkout') { return; }
      this.couponHandler.dispatcher(type, data);
    },
    'ui:click-on-reward-box-icon': function onClickRewardBoxIcon() {
      this.offersHandler.markOffersAsRead();
    },
  },

  actions: {
    getStoredOffers(filters, url) {
      if (!url) { return this.offersHandler.getStoredOffersWithMarkRelevant(filters); }
      const urlData = new UrlData(url);
      const matches = this.categoryHandler.getMatches(urlData.getPatternRequest());
      return this.offersHandler
        .getStoredOffersWithMarkRelevant(filters, { catMatches: matches, urlData });
    },

    createExternalOffer(args) {
      return (this.offersAPI) ? this.offersAPI.createExternalOffer(args) : false;
    },

    hasExternalOffer(args) {
      return (this.offersAPI) ? this.offersAPI.hasExternalOffer(args) : false;
    },

    processRealEstateMessage(message) {
      const {origin, data: {action_id: actionId, offer_id: offerId, ctaUrl = ''} = {}} = message;
      if (origin === 'dropdown' && actionId === 'offer_ca_action' && ctaUrl) {
        const campaignId = this.offersHandler.getCampaignId(offerId);
        const fakeUrl = `https://fake.url/landing/${campaignId}`;
        this.dropdownOfferData = {fakeUrl, ctaUrl};
      }

      if (this.offersAPI) {
        this.offersAPI.processRealEstateMessage(message);
      }
    },

    /**
     * Registration related methods for different real estates to offers core
     */

    registerRealEstate({ realEstateID }) {
      if (this.registeredRealEstates) {
        this.registeredRealEstates.set(realEstateID, true);
      }
    },

    unregisterRealEstate({ realEstateID }) {
      if (this.registeredRealEstates) {
        this.registeredRealEstates.delete(realEstateID);
      }
    },

    couponFormUsed(args) {
      return this.couponHandler && this.couponHandler.couponFormUsed(args);
    },

    /**
     * will set the configurations for offers, to take effect all of them you will
     * probably need to reload offers module
     */
    setConfiguration(flags) {
      this.configureFlags(flags);
    },

    getActionID() {
      return ActionID;
    },

    async flushSignals() {
      return this.signalsHandler && this.signalsHandler.flush();
    },

    onContentCategories({ categories, url, prefix }) {
      if (categories.length === 0) {
        return;
      }
      // Fake a url with category extracted from the url
      const hostname = extractHostname(url);
      const categoriesString = categories.map(cateogry =>
        `${prefix}/${encodeURIComponent(cateogry)}`).join('/');
      // Put all the category in one url,
      // prefix is used to separate stages (basket, checkout, etc...)
      const fakeUrl = `https://${hostname}/content-category/${categoriesString}`;
      const fakeUrlData = new UrlData(fakeUrl);
      // Here we pass a cpt (11) to make request, so it will only match to
      // the special pattern for the categories extracted from the page
      const matches = this.categoryHandler.newUrlEvent(fakeUrlData.getPatternRequest('xhr'));
      if (matches.matches.size > 0) {
        logger.log('Matching categories from content category', categories, matches.getCategoriesIDs(), url);
        // As if the category hit happens on the real page
        this.onCategoriesHit(matches, new UrlData(url));
      }
    },

    async onContentSignal(msg, sender) {
      logger.log('contentSignal', msg, sender.url);
      if (msg.action === 'purchase') {
        if (this.purchaseCache.has(sender.tab.id)) { return; }
        this.purchaseCache.add(sender.tab.id);
        const { categories, price } = await this.helper.action('getPageCache', sender);
        logger.log(sender.tab.id, categories, price, 'contentSignal');
        this.signalsHandler.onPurchase({
          domain: md5(getGeneralDomain(sender.url)), categories, price, ...msg
        });
      }
    },

    async learnTargeting(feature, ...rest) {
      if ((feature === 'page-class') || (feature === 'action')) {
        if (!rest.length) {
          logger.warn('learnTargeting got bad input:', rest);
          return Promise.resolve();
        }
        if (this.journeyHandler) {
          return this.journeyHandler.addFeature(rest[0]);
        }
        return Promise.resolve();
      }
      return this.categoryHandler.learnTargeting(feature);
    },

    isUrlBlacklisted(url = '') {
      return this.offersHandler.isUrlBlacklisted(url);
    },

    isUrlBlacklistedForOffer(offerId, url = '') {
      const offer = this.offersHandler.getOfferObject(offerId);
      if (!offer) {
        const msg = '[isUrlBlacklistedForOffer] there is no offer for offerId: ';
        logger.warning(msg, offerId);
        return false;
      }
      const model = new Offer(offer);
      return model.hasBlacklistPatterns()
        && model.blackListPatterns.match(new UrlData(url).getPatternRequest());
    },

    async softReloadOffers() {
      await this.softUnload();
      await this.softInit();
    },

    getOffersStatus() {
      return {
        activeCategories: this.categoryHandler.catTree
          .getAllSubCategories('')
          .map(node => node.getCategory())
          .filter(cat => cat && cat.isActive())
          .map(cat => cat.getName()),
        activeIntents: this.intentHandler.activeIntents.keys(),
        activeOffers: this.offersHandler.offersDB.offersIndexMap.keys(),
        activeRealEstates: this.registeredRealEstates,
        categories: this.categoryHandler.catTree.getAllSubCategories('')
          .map(catNode => catNode.name),
        initialized: this.initialized,
        triggerCache: Object.keys(this.globObjects.trigger_cache.triggerIndex),
      };
    },

    async triggerOfferByIntent(name, duration) {
      this.intentHandler.activateIntent(new Intent(name, duration));
      await this.offersHandler.updateIntentOffers();
      const offers = this.offersHandler.getOffersForIntent(name) || [];
      try {
        const imageLoaders = offers.map(
          offer => this.offersHandler._preloadImages(offer)
        );
        await Promise.all(imageLoaders);
      } catch (e) {
        logger.warning('Can not preload images for bootstrap offers:', e);
      }
      offers.forEach(offer => this.offersAPI.pushOffer(offer));
    }
  },
});
