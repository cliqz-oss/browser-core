import { utils, events } from 'core/cliqz';
import background from 'core/base/background';
import OffersConfigs from 'offers-v2/offers_configs';
import LoggingHandler from 'offers-v2/logging_handler';
import ExtensionEnvironment from 'offers-v2/environments/extension_environment';
import EventLoop from 'offers-v2/event_loop';
import { EventHandler } from 'offers-v2/event_handler';
import { UIOfferProcessor } from 'offers-v2/ui/ui_offer_processor';
// TODO: remove this
import {UIDisplayManager} from 'offers-v2/ui/ui_display_manager';
import {SignalHandler} from 'offers-v2/signals_handler';

////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'background';

export default background({
  enabled() {
    return true;
  },

  init(settings) {
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
      OffersConfigs.LOAD_OFFERS_HISTORY_DATA = false;
      // enable logs?
      LoggingHandler.LOG_ENABLED = true;
      LoggingHandler.SAVE_TO_FILE = true;
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


    // create the event handler
    this.eventHandler = new EventHandler();

    this.env = new ExtensionEnvironment();
    this.el = new EventLoop(this.env);

    this.onUrlChange = this.onUrlChange.bind(this);
    this.eventHandler.subscribeUrlChange(this.onUrlChange);

    // for the new ui system
    this.signalsHandler = new SignalHandler();
    this.uiOfferProc = new UIOfferProcessor(this.signalsHandler, this.eventHandler);
    this.actions = {
      windowUIConnector: this.windowUIConnector.bind(this),
    };
    this.env.uiOfferProcessor = this.uiOfferProc;
    this.env.signalHandler = this.signalsHandler;
    // TODO: remove this test method
    //this.generateTestOffers();
    //this.testSignalHandler();

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

    if (this.uiOfferProc) {
      this.uiOfferProc.destroy();
    }
    if (this.signalsHandler) {
      this.signalsHandler.destroy();
    }

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

    if (this.uiOfferProc) {
      this.uiOfferProc.savePersistenceData();
      this.uiOfferProc.destroy();
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
      if (this.uiOfferProc) {
        this.uiOfferProc.savePersistenceData();
      }
    }
  },

  onUrlChange(urlObj, url) {
    if(url) {
      this.env.emitUrlChange(url);

      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, JSON.stringify(urlObj));
    }

  },

  //////////////////////////////////////////////////////////////////////////////
  events: {
  },

  // new ui system functions needed

  //
  // @brief This should be implemented to connect the UI with the ui manager module
  // @param data should be one argument only
  //
  windowUIConnector() {
    try {
      var args = [].slice.call(arguments)[0];
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME,
                          'windowUIConnector called with args: ' + JSON.stringify(args));

      if (this.uiOfferProc) {
        this.uiOfferProc.onUICallback(args);
      }
    } catch (ee) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                          'windowUIConnector something bad happened: ' + ee);
    }
  },

  // TODO: remove this
  //
  generateTestOffers() {
    var mockOffer = {};
    var offersData = {};

    var self = this;
    utils.loadResource('chrome://cliqz/content/offers-v2/offers_examples.json',  (req) => {
       offersData = JSON.parse(req.response);

       for (let ii = 0; ii < offersData.length; ++ii) {
         mockOffer = offersData[ii];
         this.uiOfferProc.addOffer(mockOffer);

         // update the ui info
         if (ii === 0) {
          utils.setTimeout(function() {
            const newRuleInfo = {
            type: 'domains_match',
              url: [
                'offers.com'
              ],
            };
            this.uiOfferProc.addRuleInfoForOffer(offersData[0].offer_id, newRuleInfo);
          }.bind(this), 15 * 1000);

         }
       }
    });
  },

  // TODO: remove this
  testSignalHandler() {
    function linfo(msg) {
      LoggingHandler.LOG_ENABLED && LoggingHandler.info(MODULE_NAME, msg);
    }
    function lwarn(msg) {
      LoggingHandler.LOG_ENABLED && LoggingHandler.warning(MODULE_NAME, msg);
    }
    function lerr(msg) {
      LoggingHandler.LOG_ENABLED && LoggingHandler.error(MODULE_NAME, msg);
    }

    function test_createSimpleSignal() {
      var sigHandler = new SignalHandler();

      const config = {
        tts_secs: 10,
      };
      const bucketKey = 'testbucket';
      if (!sigHandler.createBucket(bucketKey, config)) {
        lerr('#signal_handler test: error creating bucket');
      }
      sigHandler.addSignal(bucketKey, 'k1', {data: 'test'});

      // add a signal every 3 seconds
      var counter = 0;
      utils.setInterval(function () {
        counter += 1;
        // here we need to process this particular bucket
        sigHandler.addSignal(bucketKey, 'k1-' + String(counter), {data: 'test-' + String(counter)});
      }, 3 * 1000);

      //sigHandler.destroy();
    }

    function test_dataPersistance() {
      var sigHandler = new SignalHandler();

      const config = {
        tts_secs: 30,
      };
      const bucketKey = 'testbucket';
      if (!sigHandler.createBucket(bucketKey, config, true)) {
        lerr('#signal_handler test: error creating bucket');
      }
      sigHandler.addSignal(bucketKey, 'k1', {data: 'test'});
      sigHandler.addSignal(bucketKey, 'k2', {data: 'test2'});
      sigHandler.addSignal(bucketKey, 'k3', {data: 'test3'});
      sigHandler.destroy();
    }

    // perform tests
    //test_createSimpleSignal();
    test_dataPersistance();

}


});
