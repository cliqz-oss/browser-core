import logger from './common/offers_v2_logger';
import { utils } from '../core/cliqz';
import background from '../core/base/background';
import OffersConfigs from './offers_configs';
import EventHandler from './event_handler';
import OfferProcessor from './offer_processor';
import { SignalHandler } from './signals_handler';
import Database from '../core/database';
import OfferDB from './offers_db';
import TriggerMachineExecutor from './trigger_machine/trigger_machine_executor';
import RegexpCache from './regexp_cache';
import RegexpHelper from './regex_helper';
import HistoryIndex from './history_index';
import QueryHandler from './query_handler';

// /////////////////////////////////////////////////////////////////////////////
// consts

export default background({

  init(/* settings */) {
    // check if we need to do something or not
    if (!utils.getPref('offers2FeatureEnabled', false)) {
      this.initialized = false;
      return;
    }

    // check for some other flags here:
    //
    // enable logging into the console
    if (utils.getPref('offersLogsEnabled', false)) {
      OffersConfigs.LOG_LEVEL = 'debug';
      OffersConfigs.LOG_ENABLED = true;
    }

    // check if we need to set dev flags or not
    // extensions.cliqz.offersDevFlag
    if (utils.getPref('offersDevFlag', false)) {
      // new ui system
      OffersConfigs.LOAD_OFFERS_STORAGE_DATA = false;
      // enable logs?
      OffersConfigs.LOG_LEVEL = 'debug';
      OffersConfigs.LOG_ENABLED = true;

      // enable trigger history
      OffersConfigs.LOAD_TRIGGER_HISTORY_DATA = false;
      // dont load signals from DB
      OffersConfigs.SIGNALS_LOAD_FROM_DB = utils.getPref('offersLoadSignalsFromDB', false);
      // avoid loading storage data if needed
      OffersConfigs.LOAD_OFFERS_STORAGE_DATA = utils.getPref('offersSaveStorage', false);
      // avoid loading db for signals
      OffersConfigs.SEND_SIG_OP_SHOULD_LOAD = false;
    }

    if (utils.getPref('triggersBE')) {
      OffersConfigs.BACKEND_URL = utils.getPref('triggersBE');
    }

    // set some extra variables
    if (utils.getPref('offersTelemetryFreq')) {
      OffersConfigs.SIGNALS_OFFERS_FREQ_SECS = utils.getPref('offersTelemetryFreq');
    }
    if (utils.getPref('offersOverrideTimeout')) {
      OffersConfigs.OFFERS_OVERRIDE_TIMEOUT = utils.getPref('offersOverrideTimeout');
    }
    logger.init();
    logger.info(`\n\n
      ------------------------------------------------------------------------
                                  NEW SESSION STARTED
      Version: ${OffersConfigs.CURRENT_VERSION}
      timestamp: ${Date.now()}
      OffersConfigs.LOG_LEVEL: ${OffersConfigs.LOG_LEVEL}
      dev_flag: ${utils.getPref('offersDevFlag', false)}
      triggersBE: ${OffersConfigs.BACKEND_URL}
      offersTelemetryFreq: ${OffersConfigs.SIGNALS_OFFERS_FREQ_SECS}
      '------------------------------------------------------------------------\n`
      );

    // create the DB to be used over all offers module
    this.db = new Database('cliqz-offers');

    // the offersDB will be used by multiple modules and will be the new place
    // where we will centralize all the information related to offers
    this.offersDB = new OfferDB(this.db);

    // create the event handler
    this.queryHandler = new QueryHandler(this.db);
    this.eventHandler = new EventHandler(this.queryHandler);

    this.onUrlChange = this.onUrlChange.bind(this);
    this.eventHandler.subscribeUrlChange(this.onUrlChange);

    // for the new ui system
    this.signalsHandler = new SignalHandler(this.db);

    this.offerProc = new OfferProcessor(this.signalsHandler,
                                        this.db,
                                        this.offersDB);

    // create the trigger machine executor
    this.globObjects = {
      regex_cache: new RegexpCache(),
      regex_helper: new RegexpHelper(),
      db: this.db,
      offer_processor: this.offerProc,
      signals_handler: this.signalsHandler,
      event_handler: this.eventHandler,
      offers_db: this.offersDB,
      history_index: new HistoryIndex(this.db),
      query_handler: this.queryHandler
    };
    this.triggerMachineExecutor = new TriggerMachineExecutor(this.globObjects);

    // to be checked on unload
    this.initialized = true;
  },

  // ///////////////////////////////////////////////////////////////////////////
  unload() {
    if (this.initialized === false) {
      return;
    }

    if (this.triggerMachineExecutor) {
      this.triggerMachineExecutor.destroy();
      this.triggerMachineExecutor = null;
    }

    if (this.globObjects) {
      if (this.globObjects.history_index) {
        this.globObjects.history_index.savePersistentData();
        this.globObjects.history_index.destroy();
      }
      this.globObjects = null;
    }

    if (this.offerProc) {
      this.offerProc.destroy();
    }
    if (this.signalsHandler) {
      this.signalsHandler.destroy();
    }
    if (this.eventHandler) {
      this.eventHandler.destroy();
      this.eventHandler = null;
    }
    if (this.offersDB) {
      this.offersDB.savePersistentData();
    }
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

    if (this.offerProc) {
      this.offerProc.savePersistenceData();
      this.offerProc.destroy();
    }

    if (this.offersDB) {
      this.offersDB.savePersistentData();
    }

    if (this.signalsHandler) {
      this.signalsHandler.savePersistenceData();
    }

    if (this.globObjects.history_index) {
      this.globObjects.history_index.savePersistentData();
    }

    // TODO: savePersistentData()
    logger.info('background script unloaded');
  },

  onUrlChange(urlObj, url) {
    if (!url || !this.triggerMachineExecutor) {
      return;
    }
    const data = {
      url,
      urlObj,
      queryInfo: this.queryHandler.normalize(url, urlObj.domain)
    };
    this.triggerMachineExecutor.processUrlChange(data);
  },

  // ///////////////////////////////////////////////////////////////////////////
  events: {
    'core.window_closed': function coreWinClose({ remaining } = {}) {
      logger.info(`window closed!!: remaining: ${remaining}`);
      // GR-147: if this is the last window then we just save everything here
      if (remaining === 0) {
        if (this.offerProc) {
          this.offerProc.savePersistenceData();
        }
      }
    },
    'offers-recv-ch': function onRealEstateMessage(message) {
      this.offerProc.processRealEstateMessage(message);
    },
  },

  actions: {
    getStoredOffers(args) {
      return (this.offerProc) ? this.offerProc.getStoredOffers(args) : [];
    },

    createExternalOffer(args) {
      return (this.offerProc) ? this.offerProc.createExternalOffer(args) : false;
    },

    hasExternalOffer(args) {
      return (this.offerProc) ? this.offerProc.hasExternalOffer(args) : false;
    },

    processRealEstateMessage(message) {
      this.offerProc.processRealEstateMessage(message);
    }
  },

});
