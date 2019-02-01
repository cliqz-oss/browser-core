/* eslint object-curly-spacing: off */

/**
 * @module offers-v2
 * @main offers-v2
 */

import logger from './common/offers_v2_logger';
import inject from '../core/kord/inject';
import { isWebExtension } from '../core/platform';
import utils from '../core/utils';
import { getGeneralDomain, extractHostname } from '../core/tlds';
import prefs from '../core/prefs';
import config from '../core/config';
import background from '../core/base/background';
import OffersConfigs from './offers_configs';
import EventHandler from './event_handler';
import SignalHandler from './signals/signals_handler';
import Database from '../core/database-migrate';
import TriggerMachineExecutor from './trigger_machine/trigger_machine_executor';
import FeatureHandler from './features/feature-handler';
import IntentHandler from './intent/intent-handler';
import OffersHandler from './offers/offers-handler';
import BEConnector from './backend-connector';
import HistoryMatcher from './history/history-matching';
import CategoryHandler from './categories/category-handler';
import CategoryFetcher from './categories/category-fetcher';
import GreenAdsHandler from './green-ads/manager';
import UrlData from './common/url_data';
import ActionID from './offers/actions-defs';
import {oncePerInterval} from './utils';
import md5 from '../core/helpers/md5';
import OfferDB from './offers/offers-db';
import PatternsStat from './patterns_stat';

// /////////////////////////////////////////////////////////////////////////////
// consts
const POPUPS_INTERVAL = 30 * 60 * 1000; // 30 minutes
const PRINT_ONBOARDING = 'print_onboarding';

// If the offers are toggled on/off, the real estate modules should
// be activated or deactivated.
// The module "freshtab" has more responsibility than showing offers
// and should not be touched from offers-v2.
function touchManagedRealEstateModules(isEnabled) {
  const managedRealEstateModules = isWebExtension
    ? ['offers-banner']
    : ['offers-cc', 'browser-panel'];
  managedRealEstateModules.forEach(moduleName =>
    prefs.set(`modules.${moduleName}.enabled`, isEnabled));
}

/**
 * @class Background
 */
export default background({
  // to be able to read the config prefs
  requiresServices: ['cliqz-config', 'telemetry'],
  popupNotification: inject.module('popup-notification'),
  helper: inject.module('myoffrz-helper'),

  // Support the constraint for managed real estate modules:
  // - if a module is initialized, it is in "registeredRealEstates"
  // - if a module is unloaded, it is not in "registeredRealEstates"
  //
  // Retain the list of real estates even if the offers are toggled on
  // and off (handled by functions "softInit" and "softUnload").
  // In particular, do not lose an entry for "freshtab".
  async init() {
    if (!this.registeredRealEstates) {
      this.registeredRealEstates = new Map();
    }

    await this.softInit();
  },

  unload() { // always sync
    return this.softUnload().then(() => {
      this.registeredRealEstates = null;
    });
  },

  // ////////
  async softInit() {
    // check if we need to do something or not
    if (!prefs.get('offers2UserEnabled', true)) {
      this.initialized = false;
      return;
    }

    this._publishPopupPushEventCached = oncePerInterval(
      this._publishPopupPushEvent,
      POPUPS_INTERVAL
    );

    // check if we need to set dev flags or not
    // extensions.cliqz.offersDevFlag
    OffersConfigs.IS_DEV_MODE = prefs.get('offersDevFlag', false);
    if (OffersConfigs.IS_DEV_MODE) {
      // new ui system
      OffersConfigs.LOAD_OFFERS_STORAGE_DATA = false;

      // dont load signals from DB
      OffersConfigs.SIGNALS_LOAD_FROM_DB = prefs.get('offersLoadSignalsFromDB', false);
      // avoid loading storage data if needed
      OffersConfigs.LOAD_OFFERS_STORAGE_DATA = prefs.get('offersSaveStorage', false);
      // avoid loading db for signals
      OffersConfigs.SEND_SIG_OP_SHOULD_LOAD = false;
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
      dev_flag: ${prefs.get('offersDevFlag', false)}
      triggersBE: ${OffersConfigs.BACKEND_URL}
      offersTelemetryFreq: ${OffersConfigs.SIGNALS_OFFERS_FREQ_SECS}
      '------------------------------------------------------------------------\n`);

    this.purchaseCache = new Set();
    // create the DB to be used over all offers module
    this.db = new Database('cliqz-offers');
    await this.db.init();
    this.offersDB = new OfferDB(this.db);
    // the backend connector
    this.backendConnector = new BEConnector();

    // create the event handler
    this.eventHandler = new EventHandler();

    this.onUrlChange = this.onUrlChange.bind(this);
    this.eventHandler.subscribeUrlChange(this.onUrlChange);

    // campaign signals with match patterns
    this.patternsStat = new PatternsStat(
      offerID => this.offersDB.getReasonForHaving(offerID)
    );
    await this.patternsStat.init();

    // campaign signals
    this.signalsHandler = new SignalHandler(
      this.db,
      null, /* sender mock */
      this.patternsStat
    );
    await this.signalsHandler.init();

    // init the features here
    this.featureHandler = new FeatureHandler();
    const historyFeature = this.featureHandler.getFeature('history');

    this.historyMatcher = new HistoryMatcher(historyFeature);

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


    // offers handling system
    this.offersHandler = new OffersHandler({
      intentHandler: this.intentHandler,
      backendConnector: this.backendConnector,
      presentRealEstates: this.registeredRealEstates,
      historyMatcher: this.historyMatcher,
      featuresHandler: this.featureHandler,
      sigHandler: this.signalsHandler,
      eventHandler: this.eventHandler,
      categoryHandler: this.categoryHandler,
      offersDB: this.offersDB,
    });
    await this.offersHandler.init();
    //
    this.offersAPI = this.offersHandler.offersAPI;

    this.gaHandler = new GreenAdsHandler();
    await this.gaHandler.init();

    // create the trigger machine executor
    this.globObjects = {
      db: this.db,
      feature_handler: this.featureHandler,
      intent_handler: this.intentHandler,
      be_connector: this.backendConnector,
      history_matcher: this.historyMatcher,
      category_handler: this.categoryHandler,
      offers_status_handler: this.offersHandler.offerStatus,
      ga_handler: this.gaHandler,
      telemetry: inject.service('telemetry'),
    };
    this.triggerMachineExecutor = new TriggerMachineExecutor(this.globObjects);

    // to be checked on unload
    this.initialized = true;
    if (prefs.get('full_distribution') === 'pk_campaign=fp1' && !prefs.get(PRINT_ONBOARDING, false)) {
      this.actions.onContentCategories({ categories: ['freundin'], prefix: 'onboarding', url: 'https://myoffrz.com/freundin' });
      prefs.set(PRINT_ONBOARDING, true);
    }
  },

  // ///////////////////////////////////////////////////////////////////////////
  async softUnload() {
    if (this.initialized === false) {
      return;
    }

    if (this.triggerMachineExecutor) {
      await this.triggerMachineExecutor.destroy();
      this.triggerMachineExecutor = null;
    }

    if (this.globObjects) {
      this.globObjects = null;
    }
    if (this.signalsHandler) {
      await this.signalsHandler.destroy();
      this.signalsHandler = null;
    }
    if (this.patternsStat) {
      await this.patternsStat.destroy();
      this.patternsStat = null;
    }
    if (this.eventHandler) {
      await this.eventHandler.destroy();
      this.eventHandler = null;
    }
    if (this.featureHandler) {
      await this.featureHandler.unload();
      this.featureHandler = null;
    }

    // this.categoryHandler = null;
    if (this.categoryFetcher) {
      await this.categoryFetcher.unload();
      this.categoryFetcher = null;
    }

    this._publishPopupPushEventCached = null;
    this.offersDB = null;
    this.initialized = false;
  },

  // ///////////////////////////////////////////////////////////////////////////
  start() {
    // nothing to do
  },

  // ///////////////////////////////////////////////////////////////////////////
  beforeBrowserShutdown() {
    // check if we have the feature  enabled
    if (!this.initialized) {
      return;
    }

    logger.info('unloading background');

    if (this.signalsHandler) {
      this.signalsHandler.destroy();
      this.signalsHandler = null;
    }

    logger.info('background script unloaded');
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
      logger.debug('Categories hit', urlData, matches.getCategoriesIDs());
    }
    this.onCategoriesHit(matches, urlData);
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
      'offersDevFlag',
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
        logger.debug(`Setting offers pref ${prefName} with vaue: ${prefValue}`);

        // check if it is a normal pref or a particular
        switch (prefName) {
          case 'offersInstallInfo':
            prefs.set(prefName, `${utils.extensionVersion}|${prefValue}`);
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
      return {...result, url, module: 'offers-v2' };
    }
    return { url, activate: false, module: 'offers-v2' };
  },

  /**
   * This action will be called from the coupon-content script whenever we detect
   * a coupon has being used on the frontend.
   * @param offerInfo is the object containing the following information:
   *   offerInfo: {
   *     offerID: 'xyz', // the offer id
   *     code: 'xyz', // the coupon code of the offer (to inject it)
   *   },
   * @param couponValue the value of the code used, or empty if none
   * @param url where it was used
   *
   * format of args: { offerInfo, couponValue, url }
   */
  _couponFormUsed(args) {
    if (this.offersHandler) {
      // eslint-disable-next-line no-param-reassign
      args.urlData = new UrlData(args.url);
      this.offersHandler.couponFormUsed(args);
    }
  },

  _publishPopupPushEvent({templateData = {}, offerInfo = {}, ghostery = false}) {
    const msg = {
      target: 'offers-v2',
      data: {
        back: offerInfo,
        config: {...templateData, ghostery},
        preShow: 'try-to-find-coupon',
        onApply: 'insert-coupon-form'
      }
    };
    this.popupNotification.action('push', msg);
  },

  _categoryHitByFakeUrl({fakeUrl}) {
    const fakeUrlData = new UrlData(fakeUrl);
    const matches = this.categoryHandler.newUrlEvent(fakeUrlData.getPatternRequest());
    if (matches.matches.size > 0) {
      logger.log('Matching categories by fake url:', matches.getCategoriesIDs(), fakeUrl);
      this.onCategoriesHit(matches, fakeUrlData);
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
    'content:dom-ready': function onDomReady(url) {
      if (!this.offersHandler) { return; }
      const result = this._shouldActivateOfferForUrl(url);
      const {activate = false, offerID, offerInfo} = result;
      if (!activate) { return; }
      const offer = this.offersHandler.getOfferObject(offerID);
      if (!offer) { return; }

      const {ui_info: {template_data: templateData = {}} = {}} = offer;
      if (Object.keys(templateData).length === 0) {
        logger.log('offer for popup-notification with empty template_data: ', offer);
        return;
      }
      const domain = getGeneralDomain(url);
      if (!(offerInfo.autoFillField || false)) {
        return;
      }
      this._publishPopupPushEventCached({
        ghostery: config.settings.channel === 'CH80', // ghostery
        key: domain,
        templateData,
        offerInfo,
      });
    },
    'popup-notification:pop': function onPopupPop(msg) {
      const {target, data: {ok, url, back, type} = {}} = msg;
      if (target !== 'offers-v2') { return; }
      const m = {
        cancel: 'coupon_autofill_field_cancel_action',
        x: 'coupon_autofill_field_x_action',
        outside: 'coupon_autofill_field_outside_action',
      };
      const couponValue = ok
        ? 'coupon_autofill_field_apply_action'
        : m[type] || 'coupon_autofill_field_unknown';
      this._couponFormUsed({
        url,
        offerInfo: back,
        couponValue,
      });
    },
    'popup-notification:log': function onPopupLog(msg) {
      const {target, data: {url, back, type, ok} = {}} = msg;
      if (target !== 'offers-v2') { return; }
      const m = {
        'pre-show': ['coupon_autofill_field_failed', false],
        'copy-code': ['coupon_autofill_field_copy_code', true],
        show: ['coupon_autofill_field_show', true],
      };
      const [couponValue, expectedResult] = m[type] || ['coupon_autofill_field_unknown', true];
      if (expectedResult !== ok) { return; }
      this._couponFormUsed({
        url,
        offerInfo: back,
        couponValue,
      });
    },
  },

  actions: {
    getStoredOffers(args) {
      return (this.offersAPI) ? this.offersAPI.getStoredOffers(args) : [];
    },

    createExternalOffer(args) {
      return (this.offersAPI) ? this.offersAPI.createExternalOffer(args) : false;
    },

    hasExternalOffer(args) {
      return (this.offersAPI) ? this.offersAPI.hasExternalOffer(args) : false;
    },

    processRealEstateMessage(message) {
      const {origin, data: {action_id: actionId, offer_id: offerId} = {}} = message;
      if (origin === 'dropdown' && actionId === 'offer_ca_action') {
        const campaignId = this.offersHandler.getCampaignId(offerId);
        const fakeUrl = `https://fake.url/landing/${campaignId}`;
        this._categoryHitByFakeUrl({fakeUrl});
      }

      if (this.offersAPI) {
        this.offersAPI.processRealEstateMessage(message);
      }
    },

    /**
     * Registration realated methods for different real estates to offers core
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

    activateCouponDetectionOnUrl(url) {
      return this._shouldActivateOfferForUrl(url);
    },

    couponFormUsed(args) {
      this._couponFormUsed(args);
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
      const matches = this.categoryHandler.newUrlEvent(fakeUrlData.getPatternRequest(11));
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
    }
  },

});
