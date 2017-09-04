import background from '../core/base/background';
import { utils } from '../core/cliqz';

import MAConfigs from './conf/ma_configs';
import logger from './common/logger';
import CliqzMarketAnalyzer from './market_analyzer_main';

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {
    if (MAConfigs.IS_ENABLED) {
      CliqzMarketAnalyzer.init();
      // The content of this file is subject to change
      // The file is shipped together with the releases
      const url = 'chrome://cliqz/content/market-analysis/mappings.json';
      utils.httpGet(url, (res) => {
        CliqzMarketAnalyzer.regexMappings = JSON.parse(res.response);
        this.initialized = true;
        logger.log('>>> Loaded mappings.json <<<');

        // log configurations:
        if (MAConfigs.LOG_LEVEL === 'debug') {
          logger.log(`Backend Addresss: ${MAConfigs.SIGNALS_BE_ADDR}`);
          logger.log(`Signal version: ${MAConfigs.SIGNALS_VERSION}`);
          logger.log(`Send Signal Interval (s) : ${MAConfigs.SIGNALS_SEND_INTERVAL_SECS}`);
        }
      });
    }
  },

  unload() {
    if (CliqzMarketAnalyzer.sendSignalTO) {
      utils.clearTimeout(CliqzMarketAnalyzer.sendSignalTO);
    }
    if (CliqzMarketAnalyzer.sendSignalLoopTO) {
      utils.clearTimeout(CliqzMarketAnalyzer.sendSignalLoopTO);
    }
  },

  beforeBrowserShutdown() {

  },

  events: {
    'content:location-change': function onLocationChange({ url }) {
      if (this.initialized) {
        CliqzMarketAnalyzer.matchURL(url);
      }
    }
  },

  actions: {
  },
});
