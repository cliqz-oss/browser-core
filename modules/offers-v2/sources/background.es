import logger from './common/offers_v2_logger';
import prefs from '../core/prefs';
import events from '../core/events';
import config from '../core/config';
import background from '../core/base/background';
import OffersConfigs, { confOnPrefChange } from './offers_configs';
import EventHandler from './event_handler';
import SignalHandler from './signals/signals_handler';
import Database from '../core/database';
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

// /////////////////////////////////////////////////////////////////////////////
// consts
const OFFERS_CC_ENABLED = 'modules.offers-cc.enabled';
const PROMO_BAR_ENABLED = 'modules.browser-panel.enabled';

export default background({
  // to be able to read the config prefs
  requiresServices: ['cliqz-config'],

  init(/* settings */) {
    // check if we need to do something or not
    if (!prefs.get('offers2FeatureEnabled', true) || !prefs.get('offers2UserEnabled', true)) {
      this.initialized = false;
      return Promise.resolve();
    }

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
      '------------------------------------------------------------------------\n`
    );

    // create the DB to be used over all offers module
    this.db = new Database('cliqz-offers');

    // the backend connector
    this.backendConnector = new BEConnector();

    // create the event handler
    this.eventHandler = new EventHandler();

    this.onUrlChange = this.onUrlChange.bind(this);
    this.eventHandler.subscribeUrlChange(this.onUrlChange);

    // for the new ui system
    this.signalsHandler = new SignalHandler(this.db);

    // init the features here
    this.featureHandler = new FeatureHandler();
    const historyFeature = this.featureHandler.getFeature('history');

    this.historyMatcher = new HistoryMatcher(historyFeature);

    // we will keep track of the real estates that we currently have.
    this.registeredRealEstates = new Map();

    // intent system
    this.intentHandler = new IntentHandler();
    this.intentHandler.init();

    // category system
    this.categoryHandler = new CategoryHandler(historyFeature, this.db);

    // load the data from the category handler and the fetcher
    this.categoryFetcher =
      new CategoryFetcher(this.backendConnector, this.categoryHandler, this.db);
    this.categoryHandler.loadPersistentData().then(() => this.categoryFetcher.init());

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
      db: this.db,
    });
    //
    this.offersAPI = this.offersHandler.offersAPI;


    this.gaHandler = new GreenAdsHandler();

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
    };
    this.triggerMachineExecutor = new TriggerMachineExecutor(this.globObjects);

    // to be checked on unload
    this.initialized = true;

    // gather all the real estates we have
    events.pub('offers-re-registration', { type: 'broadcast' });

    return this.gaHandler.init();
  },

  // ///////////////////////////////////////////////////////////////////////////
  unload() {
    this.softUnload();
  },

  softUnload() {
    if (this.initialized === false) {
      return;
    }

    if (this.triggerMachineExecutor) {
      this.triggerMachineExecutor.destroy();
      this.triggerMachineExecutor = null;
    }

    if (this.globObjects) {
      this.globObjects = null;
    }
    if (this.signalsHandler) {
      this.signalsHandler.destroy();
      this.signalsHandler = null;
    }
    if (this.eventHandler) {
      this.eventHandler.destroy();
      this.eventHandler = null;
    }
    if (this.featureHandler) {
      this.featureHandler.unload();
      this.featureHandler = null;
    }

    // this.categoryHandler = null;
    if (this.categoryFetcher) {
      this.categoryFetcher.unload();
      this.categoryFetcher = null;
    }

    this.initialized = false;
  },

  // ///////////////////////////////////////////////////////////////////////////
  start() {
    // nothing to do
  },

  // ///////////////////////////////////////////////////////////////////////////
  beforeBrowserShutdown() {
    // check if we have the feature  enabled
    if (this.initialized === false) {
      return;
    }

    logger.info('unloading background');

    if (this.triggerMachineExecutor) {
      this.triggerMachineExecutor.destroy();
      this.triggerMachineExecutor = null;
    }

    if (this.signalsHandler) {
      this.signalsHandler.savePersistenceData();
    }

    // TODO: savePersistentData()
    logger.info('background script unloaded');
  },

  onUrlChange(urlData) {
    if (!urlData || !this.triggerMachineExecutor) {
      return;
    }

    // evaluate categories first and store in the urlData all the categories
    // activated for that given url
    const categoriesIDsSet = this.categoryHandler.newUrlEvent(urlData.getPatternRequest());
    urlData.setActivatedCategoriesIDs(categoriesIDsSet);

    // process the trigger engine now
    const data = {
      url_data: urlData,
    };

    // We want to have the following behavior to be able to show offers on
    // the same url change:
    // - trigger machine
    // - fetch intents
    // - process offers (handler)
    //
    // Since fetch intents is now in offers handler this is enough
    this.triggerMachineExecutor.processUrlChange(data)
      .then(() => this.offersHandler.urlChangedEvent(urlData));
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
      'offers2FeatureEnabled',
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
            prefs.set(prefName, `${config.EXTENSION_VERSION}|${prefValue}`);
            break;
          default:
            prefs.set(prefName, prefValue);
        }
      } else {
        logger.debug(`The offers pref with name ${prefName} is not valid in offers`);
      }
    });
  },

  // ///////////////////////////////////////////////////////////////////////////
  events: {
    'offers-recv-ch': function onRealEstateMessage(message) {
      if (this.offersAPI) {
        this.offersAPI.processRealEstateMessage(message);
      }
    },
    prefchange: function onPrefChange(pref) {
      confOnPrefChange(pref);
      if (pref !== 'offers2UserEnabled') { return; }
      const offers2UserEnabled = prefs.get('offers2UserEnabled', true);
      prefs.set(OFFERS_CC_ENABLED, offers2UserEnabled);
      prefs.set(PROMO_BAR_ENABLED, offers2UserEnabled);
      if (offers2UserEnabled) {
        this.init();
      } else {
        this.softUnload();
      }
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
    activateCouponDetectionOnUrl(url) {
      if (this.offersHandler) {
        const urlData = new UrlData(url);
        const result = this.offersHandler.shouldActivateOfferForUrl(urlData) ||
          { activate: false };
        result.url = url;
        return result;
      }
      return { url, activate: false };
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
    couponFormUsed(args) {
      /* eslint no-param-reassign: "off" */
      if (this.offersHandler) {
        args.urlData = new UrlData(args.url);
        this.offersHandler.couponFormUsed(args);
      }
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
  },

});
