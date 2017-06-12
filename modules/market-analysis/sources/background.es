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
      this.initialized = true;
      // The content of this file is subject to change
      // The file is shipped together with the releases
      const url = 'chrome://cliqz/content/market-analysis/mappings.json';
      utils.httpGet(url, (res) => {
        CliqzMarketAnalyzer.regexMappings = JSON.parse(res.response);
        logger.log('>>> Loaded mappings.json <<<');
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
