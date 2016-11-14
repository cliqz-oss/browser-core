import { utils, events } from 'core/cliqz';
import { OfferManager } from 'offers/offer_manager';
import background from 'core/base/background';
import LoggingHandler from 'offers/logging_handler';
import OffersConfigs from 'offers/offers_configs';
import { EventHandler } from 'offers/event_handler';


////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'background';

export default background({
  enabled() {
    return true;
  },

  init(settings) {
    // check if we need to do something or not
    if (!utils.getPref('grFeatureEnabled', false)) {
      this.initialized = false;
      return;
    }
    // create the event handler
    this.eventHandler = new EventHandler();

    // configure the preferences here
    OffersConfigs.OFFER_SUBCLUSTER_SWITCH = utils.getPref('grOfferSwitchFlag', false);

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
    // avoid read history from file
    if (utils.getPref('offersAvoidReadHistory', false)) {
      OffersConfigs.LOAD_HISTORY_EVENTS = false;
    }
    // avoid load / save cupon handler data
    if (utils.getPref('offersAvoidLoadCuponsData', false)) {
      OffersConfigs.COUPON_HANDLER_LOAD_FILE_FLAG = false;
    }
    // reset coupons data
    if (utils.getPref('offersResetCouponsData', false)) {
      OffersConfigs.COUPON_HANDLER_RESET_FILE = true;
    }

    // change the fetcher url for debug purpose
    if(utils.getPref('offersFetcherDevBE', false)) {
      OffersConfigs.OFFER_FETCHER_DEST_URL = OffersConfigs.OFFER_DEV_URL;
    }

    // check if we need to set dev flags or not
    // extensions.cliqz.offersDevFlag
    if (utils.getPref('offersDevFlag', false)) {
      OffersConfigs.LOAD_HISTORY_EVENTS = false;
      OffersConfigs.COUPON_HANDLER_RESET_FILE = true;
      OffersConfigs.COUPON_HANDLER_LOAD_FILE_FLAG = false;
      OffersConfigs.DEBUG_MODE = true;
      // enable logs?
      LoggingHandler.LOG_ENABLED = true;
      LoggingHandler.SAVE_TO_FILE = true;
    }

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, "settings" + JSON.stringify(settings));

    // init the logging
    LoggingHandler.init();

    // define all the variables here
    this.db = null;
    // offer manager
    this.offerManager = new OfferManager(settings, this.eventHandler);

    // TODO: GR-137 && GR-140: temporary fix
    events.sub('core.window_closed', this.onWindowClosed.bind(this));

    // print the timestamp
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
      '\n\n' +
      '------------------------------------------------------------------------\n' +
      '                           NEW SESSION STARTED\n' +
      'Version: ' + OffersConfigs.CURRENT_VERSION + '\n' +
      'timestamp: ' + Date.now() + '\n' +
      'switchFlag: ' + OffersConfigs.OFFER_SUBCLUSTER_SWITCH + '\n' +
      'LoggingHandler.LOG_ENABLED: ' + LoggingHandler.LOG_ENABLED + '\n' +
      'LoggingHandler.SAVE_TO_FILE: ' + LoggingHandler.SAVE_TO_FILE + '\n' +
      'OffersConfigs.LOAD_HISTORY_EVENTS: ' + OffersConfigs.LOAD_HISTORY_EVENTS + '\n' +
      'OffersConfigs.COUPON_HANDLER_LOAD_FILE_FLAG: ' + OffersConfigs.COUPON_HANDLER_LOAD_FILE_FLAG + '\n' +
      'OffersConfigs.COUPON_HANDLER_RESET_FILE: ' + OffersConfigs.COUPON_HANDLER_RESET_FILE + '\n' +
      'OffersConfigs.OFFER_FETCHER_DEST_URL: ' + OffersConfigs.OFFER_FETCHER_DEST_URL + '\n' +
      'dev_flag: ' + utils.getPref('offersDevFlag', false) + '\n' +
      '------------------------------------------------------------------------\n'
      );

    // to be checked on unload
    this.initialized = true;
  },

  //////////////////////////////////////////////////////////////////////////////
  unload() {
    if (this.initialized === false) {
      return;
    }

    // TODO: GR-137 && GR-140: temporary fix
    events.un_sub('core.window_closed', this.onWindowClosed.bind(this));

    if (this.eventHandler) {
      this.eventHandler.destroy();
      delete this.eventHandler;
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

    // destroy classes
    if (this.offerManager) {
      this.offerManager.savePersistentData();
      this.offerManager.destroy();
      delete this.offerManager;
      this.offerManager = null;
    }

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'background script unloaded');
  },

  //////////////////////////////////////////////////////////////////////////////
  onWindowClosed(data) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'window closed!!: remaining: ' + data.remaining);
    // GR-147: if this is the last window then we just save everything here
    if (data.remaining === 0) {
      // save alles here
      if (this.offerManager) {
        this.offerManager.savePersistentData();
      }
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  events: {
  },


});
