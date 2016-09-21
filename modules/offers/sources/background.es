import { utils, events } from 'core/cliqz';
import { OfferManager } from 'offers/offer_manager';
import background from 'core/base/background';
import LoggingHandler from 'offers/logging_handler';
import OffersConfigs from 'offers/offers_configs';
import WebRequest from 'core/webrequest';



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

    this.beforeRequestListener = this.beforeRequestListener.bind(this)

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


    // init the logging
    LoggingHandler.init();

    // define all the variables here
    this.db = null;
    // offer manager
    this.offerManager = new OfferManager();

    // TODO: GR-137 && GR-140: temporary fix
    events.sub('core.location_change', this.onTabOrWinChangedHandler.bind(this));
    events.sub('core.window_closed', this.onWindowClosed.bind(this));
    events.sub('core.tab_location_change', this.onTabLocChanged.bind(this));

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


    // add request listener
    WebRequest.onBeforeRequest.addListener(this.beforeRequestListener);

    // to be checked on unload
    this.initialized = true;
  },

  //////////////////////////////////////////////////////////////////////////////
  unload() {
    if (this.initialized === false) {
      return;
    }

    // TODO: GR-137 && GR-140: temporary fix
    events.un_sub('core.location_change', this.onTabOrWinChangedHandler.bind(this));
    events.un_sub('core.window_closed', this.onWindowClosed.bind(this));
    events.un_sub('core.tab_location_change', this.onTabLocChanged.bind(this));

    WebRequest.onBeforeRequest.removeListener(this.beforeRequestListener);
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
  onTabLocChanged(data) {

    // EX-2561: private mode then we don't do anything here
    if (data.isOnPrivateContext) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'window is private skipping: onTabLocChanged');
      return;
    }

    // We need to subscribe here to get events everytime the location is
    // changing and is the a new url. We had issues since everytime we switch
    // the tabs we got the event from core.locaiton_change and this is not correct
    // for our project.
    // Check issue https://cliqztix.atlassian.net/projects/GR/issues/GR-117
    //
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, '[window] location changed from background ' + data);

    // skip the event if is the same document here
    // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener
    //
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'new event with location: ' + data.url + ' - referrer: ' + data.referrer);
    if (data.flags === Components.interfaces.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'discarding event since it is repeated');
      return;
    }
    // else we emit the event here
    this.onLocationChangeHandler(data.url, data.referrer);
  },

  //////////////////////////////////////////////////////////////////////////////
  onLocationChangeHandler(url, referrer) {
    if (!this.offerManager) {
      return;
    }
    var u = utils.getDetailsFromUrl(url);
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'location changed to ' + u.host);

    // now we add the referrer to the url
    if (referrer) {
      var referrerUrlDetails = utils.getDetailsFromUrl(referrer);
      u['referrer'] = referrerUrlDetails.name;
    } else {
      u['referrer'] = '';
    }

    try {
      this.offerManager.processNewEvent(u);
    } catch (e) {
      // log this error, is nasty, something went wrong
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'Exception catched when processing a new event: ' + e,
                           LoggingHandler.ERR_INTERNAL);
    }
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
  onTabOrWinChangedHandler(url, isWinPrivate) {
    // check if this is the window
    // EX-2561: private mode then we don't do anything here
    if (isWinPrivate) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'window is private skipping: onTabOrWinChangedHandler');
      return;
    }
    if (!this.offerManager) {
      return;
    }

    try {
      var u = utils.getDetailsFromUrl(url);
      this.offerManager.onTabOrWinChanged(u);
    } catch (e) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'Exception catched on onTabOrWinChangedHandler: ' + e,
                           LoggingHandler.ERR_INTERNAL);
    }
  },


  //////////////////////////////////////////////////////////////////////////////
  beforeRequestListener(requestObj) {
    try {
      this.offerManager && this.offerManager.beforeRequestListener(requestObj);
    } catch (e) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
       'Exception catched when detecting voucher usage ' + e,
       LoggingHandler.ERR_INTERNAL);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  events: {
  },


});
