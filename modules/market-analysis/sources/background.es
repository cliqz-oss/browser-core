import background from '../core/base/background';
import inject from '../core/kord/inject';
import { httpGet } from '../core/http';
import { shouldEnableModule } from '../core/app';
import config from '../core/config';

import MAConfigs from './conf/ma_configs';
import logger from './common/logger';
import CliqzMarketAnalyzer from './market_analyzer_main';

/**
  @namespace marker-analysis
  @module marker-analysis
  @class Background
 */
export default background({
  requiresServices: ['telemetry'],
  isRunning: false,

  /**
    @method init
    @param settings
  */
  init() {
    // If module is already running, skip.
    if (this.isRunning) { return; }

    const telemetry = inject.service('telemetry', ['onTelemetryEnabled', 'onTelemetryDisabled', 'isEnabled']);

    // Register listeners for telemetry state change.
    telemetry.onTelemetryEnabled(this.actions.onTelemetryEnabled);
    telemetry.onTelemetryDisabled(this.actions.onTelemetryDisabled);

    // If telemetry is currently disabled, do not init.
    if (!telemetry.isEnabled()) { return; }

    logger.debug('init');
    this.isRunning = true;

    if (MAConfigs.IS_ENABLED) {
      CliqzMarketAnalyzer.init();
      // The content of this file is subject to change
      // The file is shipped together with the releases
      const url = `${config.baseURL}/market-analysis/mappings.json`;
      httpGet(url, (res) => {
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
    if (!this.isRunning) { return; }
    this.isRunning = false;

    logger.debug('unloading');

    if (CliqzMarketAnalyzer.sendSignalTO) {
      clearTimeout(CliqzMarketAnalyzer.sendSignalTO);
    }
    if (CliqzMarketAnalyzer.sendSignalLoopTO) {
      clearTimeout(CliqzMarketAnalyzer.sendSignalLoopTO);
    }
  },

  beforeBrowserShutdown() {
  },

  events: {
    'content:location-change': function onLocationChange({ url, isPrivate }) {
      if (this.initialized && !isPrivate) {
        CliqzMarketAnalyzer.matchURL(url);
      }
    }
  },

  actions: {
    // Life-cycle handlers
    onTelemetryEnabled() {
      if (shouldEnableModule('market-analysis')) {
        this.init();
      }
    },
    onTelemetryDisabled() {
      this.unload();
    },
  },
});
