import { utils, events } from '../core/cliqz';
import background from '../core/base/background';
import OffersConfigs from './offers_configs';
import LoggingHandler from './logging_handler';
import ExtensionEnvironment from './environments/extension_environment';
import EventLoop from './event_loop';
import { EventHandler } from './event_handler';
import OfferProcessor from './offer_processor';
import {SignalHandler} from './signals_handler';
import Database from '../core/database';
import OfferDB from './offers_db';


////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'background';

export default background({

  init(settings) {
    var self = this;

    // check if we need to do something or not
    if (!utils.getPref('offers2FeatureEnabled', false)) {
      this.initialized = false;
      return;
    }

    // check for some other flags here:
    //
    // enable logging into the console
    if (utils.getPref('offersLogsEnabled', false)) {
      LoggingHandler.LOG_ENABLED = true;
    }
    // enable logs in file
    if (utils.getPref('offersFileLogsEnabled', false)) {
      LoggingHandler.SAVE_TO_FILE = true;
    }

    // check if we need to set dev flags or not
    // extensions.cliqz.offersDevFlag
    if (utils.getPref('offersDevFlag', false)) {
      // new ui system
      OffersConfigs.LOAD_OFFERS_STORAGE_DATA = false;
      // enable logs?
      LoggingHandler.LOG_ENABLED = true;
      LoggingHandler.SAVE_TO_FILE = true;

      // enable trigger history
      OffersConfigs.LOAD_TRIGGER_HISTORY_DATA = false;
      // dont load signals from DB
      OffersConfigs.SIGNALS_LOAD_FROM_DB = utils.getPref('offersLoadSignalsFromDB', false);
      // avoid loading storage data if needed
      OffersConfigs.LOAD_OFFERS_STORAGE_DATA = utils.getPref('offersSaveStorage', false);
    }

    if(utils.getPref('triggersBE')) {
      OffersConfigs.BACKEND_URL = utils.getPref('triggersBE');
    }

    // set some extra variables
    if(utils.getPref('offersTelemetryFreq')) {
      OffersConfigs.SIGNALS_OFFERS_FREQ_SECS = utils.getPref('offersTelemetryFreq');
    }
    if(utils.getPref('offersOverrideTimeout')) {
      OffersConfigs.OFFERS_OVERRIDE_TIMEOUT = utils.getPref('offersOverrideTimeout');
    }



    // init the logging
    LoggingHandler.init();
    LoggingHandler.LOG_ENABLED && LoggingHandler.info(MODULE_NAME, 'init');

    // init the logging
    LoggingHandler.init();

    // TODO: GR-137 && GR-140: temporary fix
    this.onWindowClosed = this.onWindowClosed.bind(this);
    events.sub('core.window_closed', this.onWindowClosed);

    // print the timestamp
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
      '\n\n' +
      '------------------------------------------------------------------------\n' +
      '                           NEW SESSION STARTED\n' +
      'Version: ' + OffersConfigs.CURRENT_VERSION + '\n' +
      'timestamp: ' + Date.now() + '\n' +
      'LoggingHandler.LOG_ENABLED: ' + LoggingHandler.LOG_ENABLED + '\n' +
      'LoggingHandler.SAVE_TO_FILE: ' + LoggingHandler.SAVE_TO_FILE + '\n' +
      'dev_flag: ' + utils.getPref('offersDevFlag', false) + '\n' +
      '------------------------------------------------------------------------\n'
      );

    // create the DB to be used over all offers module
    this.db = new Database('cliqz-offers');

    // the offersDB will be used by multiple modules and will be the new place
    // where we will centralize all the information related to offers
    this.offersDB = new OfferDB(this.db);

    // create the event handler
    this.eventHandler = new EventHandler();

    this.env = new ExtensionEnvironment();
    this.el = new EventLoop(this.env);

    this.onUrlChange = this.onUrlChange.bind(this);
    this.eventHandler.subscribeUrlChange(this.onUrlChange);

    this.onHttpRequest = this.onHttpRequest.bind(this);
    this.env.watchDomain = function(domain) {
      if(self.eventHandler.subscribeHttpReq(self.onHttpRequest, domain)) {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, "Subscribed to all HTTP requests for domain " + domain);
      }
    };

    // for the new ui system
    this.signalsHandler = new SignalHandler(this.db);

    this.offerProc = new OfferProcessor(this.signalsHandler,
                                        this.db,
                                        this.offersDB);

    this.actions = {
      getStoredOffers: this.getStoredOffers.bind(this),
    };
    this.env.offerProcessor = this.offerProc;
    this.env.signalHandler = this.signalsHandler;
    this.env.offersDB = this.offersDB;

    // to be checked on unload
    this.initialized = true;
  },

  //////////////////////////////////////////////////////////////////////////////
  unload() {
    if (this.initialized === false) {
      return;
    }

    // TODO: GR-137 && GR-140: temporary fix
    events.un_sub('core.window_closed', this.onWindowClosed);

    if (this.offerProc) {
      this.offerProc.destroy();
    }
    if (this.signalsHandler) {
      this.signalsHandler.destroy();
    }
    if (this.eventHandler) {
      this.eventHandler.destroy();
      delete this.eventHandler;
    }
    if (this.offersDB) {
      this.offersDB.savePersistentData();
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  start() {
    // nothing to do
  },

  //////////////////////////////////////////////////////////////////////////////
  beforeBrowserShutdown() {
    // check if we have the feature  enabled
    if (this.initialized === false) {
      return;
    }

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'unloading background');

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

    //TODO: savePersistentData()

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'background script unloaded');
  },

  //////////////////////////////////////////////////////////////////////////////
  onWindowClosed(data) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'window closed!!: remaining: ' + data.remaining);
    // GR-147: if this is the last window then we just save everything here
    if (data.remaining === 0) {
      if (this.offerProc) {
        this.offerProc.savePersistenceData();
      }
    }
  },

  onUrlChange(urlObj, url) {
    if(url) {
      this.env.emitUrlChange(url, urlObj);
    }
  },

  onHttpRequest(reqObj) {
    if(reqObj && reqObj.req_obj && reqObj.req_obj.url) {
      this.env.emitUrlChange(reqObj.req_obj.url);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  events: {
  },

  actions: {
  },

  //////////////////////////////////////////////////////////////////////////////
  // offers storage interfaces

  //
  // return the offers on the storage
  //
  getStoredOffers(args) {
    return (this.offerProc) ? this.offerProc.getStoredOffers(args) : [];
  },





});
