import background from '../core/base/background';
import getDemographics from '../core/demographics';
import getSynchronizedDate from '../core/synchronized-time';
import prefs from '../core/prefs';
import telemetry from '../core/services/telemetry';
import utils from '../core/utils';
import { shouldEnableModule } from '../core/app';
import { subscribe } from '../core/events';
import { isMobile } from '../core/platform';

import Anolysis from './internals/anolysis';
import Config from './internals/config';
import DexieStorage from './internals/storage/dexie';
import AsyncStorage from './internals/storage/async-storage';
import logger from './internals/logger';

import signalDefinitions from './telemetry-schemas';


const LATEST_VERSION_USED_PREF = 'anolysisVersion';

/**
 * VERSION is used to signal major changes in Anolysis. Its purpose so far is to
 * only signal when the state of the client should be reset, which is a
 * temporary thing.
 */
const VERSION = 7;


function versionWasUpdated() {
  return prefs.get(LATEST_VERSION_USED_PREF, null) !== VERSION;
}


function storeNewVersionInPrefs() {
  prefs.set(LATEST_VERSION_USED_PREF, VERSION);
}

function sendTelemetry(msg, instantPush, schemaName) {
  return telemetry.push(msg, schemaName);
}

/**
 * This function will instantiate an Anolysis class. It will also check if the
 * internal states need to be reset (on version bump).
 */
async function instantiateAnolysis() {
  const demographics = await getDemographics();
  const Storage = isMobile ? AsyncStorage : DexieStorage;
  const config = new Config({ demographics, Storage });
  let anolysis = new Anolysis(config);

  // Check if we should reset
  if (versionWasUpdated()) {
    logger.log('reset anolysis state because of update');
    await anolysis.reset();
    storeNewVersionInPrefs();
    anolysis = new Anolysis(config);
  }

  await anolysis.registerSignalDefinitions(signalDefinitions);
  await anolysis.init();

  return anolysis;
}


/**
 * Manages new telemetry.
 */
export default background({
  // to be able to read the config prefs
  requiresServices: ['cliqz-config', 'session', 'telemetry'],
  isBackgroundInitialized: false,
  app: null,
  settings: null,
  anolysis: null,

  async init(settings, app) {
    logger.debug('init');

    // Prevent calling `init` two times in a row
    if (this.isBackgroundInitialized) { return; }

    this.app = app;
    this.settings = settings;

    // Listen to telemetry service for opt-out/in events
    telemetry.onTelemetryEnabled(this.actions.onTelemetryEnabled);
    telemetry.onTelemetryDisabled(this.actions.onTelemetryDisabled);

    // If telemetry is not enabled (opted-out), we do not start
    if (!telemetry.isEnabled()) {
      this.isBackgroundInitialized = false;
      return;
    }
    this.isBackgroundInitialized = true;

    if (getSynchronizedDate() === null) {
      // TODO - temporary signal for debugging purpose. This allows us to detect
      // users not having anolysis enabled because `config_ts` is not available.
      utils.telemetry({
        type: 'anolysis.no_sync_time_available',
      });

      // If `config_ts` arrives later, we can delay the loading of anolysis. We
      // make sure that the event listener cannot be registered two times.
      if (!this.onPrefChange) {
        this.onPrefChange = subscribe('prefchange', (pref) => {
          if (pref === 'config_ts') {
            this.onPrefChange.unsubscribe();
            this.onPrefChange = undefined;

            // Init anolysis module
            logger.debug('init Anolysis after config_ts pref change');
            this.init(this.settings, this.app);
          }
        });
      }
    } else {
      // Initialize the module - we only do that if a sync date is available

      // If `init` is called a second time after we init but config_ts was not
      // available, remove it.
      if (this.onPrefChange) {
        logger.debug('remove config_ts pref listener');
        this.onPrefChange.unsubscribe();
        this.onPrefChange = undefined;
      }

      // TODO - send ping_anolysis signal with legacy telemetry system
      // This is only meant for testing purposes and will be remove in
      // the future.
      utils.telemetry({
        type: 'anolysis.start_init',
      });

      try {
        // Create an instance of Anolysis and initialize it
        logger.debug('instantiate Anolysis');

        const anolysis = await instantiateAnolysis();

        // Because Anolysis module can be initialized/unloaded on pref change
        // (independently of the App's life-cycle), it can happen (rarely), that
        // Anolysis is initialized two times concurrently (that can happen if
        // `unload` is called while the background is being initialized). In
        // such case, we abort initialization.
        if (this.anolysis || !this.isBackgroundInitialized || !telemetry.isEnabled()) {
          logger.log('concurrent Anolysis init, aborting');
          anolysis.unload();
          return;
        }

        this.anolysis = anolysis;

        // TODO
        // Register legacy telemetry signals listener. In the future this should
        // not be needed as the `utils.telemetry` function should directly call
        // the action `log` of this background (using the kord mechanism).
        logger.debug('register Anolysis telemetryHandler');
        const index = utils.telemetryHandlers.indexOf(sendTelemetry);
        if (index === -1) {
          utils.telemetryHandlers.push(sendTelemetry);
        }

        // Start aggregations as soon as the extension is loaded. This ensures
        // that metrics/aggregations can inject other modules safely.
        logger.debug('trigger aggregations');
        this.anolysis.onNewDay(prefs.get('config_ts'));

        // TODO - send ping_anolysis signal with legacy telemetry system
        // This is only meant for testing purposes and will be remove in
        // the future.
        utils.telemetry({
          type: 'anolysis.start_end',
        });
      } catch (ex) {
        // TODO - send ping_anolysis signal with legacy telemetry system
        // This is only meant for testing purposes and will be remove in
        // the future.
        logger.error('Exception while init anolysis', ex);
        this.unload();
        utils.telemetry({
          type: 'anolysis.start_exception',
          exception: `${ex}`,
        });
      }
    }
  },

  unload() {
    logger.log('unloading');
    this.isBackgroundInitialized = false;

    if (this.onPrefChange) {
      logger.debug('remove config_ts pref listener');
      this.onPrefChange.unsubscribe();
      this.onPrefChange = undefined;
    }

    // TODO - this will be removed when the telemetry function makes use of this
    // module exclusively.
    // Unsubscribe telemetry listener
    const index = utils.telemetryHandlers.indexOf(sendTelemetry);
    if (index !== -1) {
      logger.debug('remove Anolysis telemetryHandler');
      utils.telemetryHandlers.splice(index, 1);
    }

    if (this.anolysis) {
      logger.debug('unloading Anolysis');
      this.anolysis.unload();
      this.anolysis = null;
    }
  },

  beforeBrowserShutdown() {
  },

  isAnolysisInitialized() {
    return this.isBackgroundInitialized && this.anolysis && this.anolysis.running;
  },

  events: {
    prefchange(pref) {
      // Detect new days and trigger retention signals/aggregation accordingly.
      if (pref === 'config_ts') {
        if (this.isAnolysisInitialized()) {
          // Notify anolysis that the date just changed.
          this.anolysis.onNewDay(prefs.get('config_ts'));
        }
      }
    },
  },

  actions: {
    getSignalDefinitions() {
      return [...this.anolysis.availableDefinitions.entries()];
    },

    registerSignalDefinitions(schemas) {
      if (!this.anolysis) {
        return Promise.resolve();
      }

      return this.anolysis.registerSignalDefinitions(schemas);
    },

    handleTelemetrySignal(msg, instantPush, schemaName) {
      // When calling `telemetry.push` from `core/services`, messages will wait
      // for Anolysis module to be initialized before calling the action, so we
      // should not loose any signal.
      if (!this.isAnolysisInitialized()) {
        return Promise.reject(`Anolysis is disabled, ignoring: ${schemaName} ${JSON.stringify(msg)}`);
      }

      // No telemetry in private windows
      if (utils.isPrivateMode()) {
        return Promise.resolve();
      }

      if (instantPush && schemaName) {
        logger.error('instantPush argument is ignored by anolysis, please specify "sendToBackend" this in signals\' schema');
      }

      return this.anolysis.handleTelemetrySignal(msg, schemaName).catch((ex) => {
        // We only count it as exception if Anolysis is running. It can happen
        // that signals are sent slightly before Anolysis is stopped, but they
        // are processed async and they are persisted just after Storage is
        // unloaded. So we ignore exception happening when Anolysis is not
        // running.
        if (this.isAnolysisInitialized()) {
          logger.error('handleTelemetrySignal', ex, msg, schemaName);
        } else {
          logger.debug(
            'Sending message was dropped because Anolysis was stopped',
            ex,
            msg,
            schemaName,
          );
        }
      });
    },

    getGID() {
      if (!this.isAnolysisInitialized()) {
        return Promise.reject('Cannot call `getGID` when Anolysis is unloaded');
      }
      return this.anolysis.gidManager.getGID();
    },

    async getMetricsForDate(date) {
      if (!this.isAnolysisInitialized()) {
        return Promise.reject('Cannot call `getMetricsForDate` when Anolysis is unloaded');
      }
      return (await this.anolysis.storage.behavior.getTypesForDate(date)).toObj();
    },

    getLastGIDUpdateDate() {
      if (!this.isAnolysisInitialized()) {
        return Promise.reject('Cannot call `getLastGIDUpdateDate` when Anolysis is unloaded');
      }
      return this.anolysis.gidManager.getLastGIDUpdateDate();
    },

    getDemographics() {
      return getDemographics();
    },

    // Life-cycle handlers
    onTelemetryEnabled() {
      if (shouldEnableModule('anolysis')) {
        this.init(this.settings, this.app);
      }
    },
    onTelemetryDisabled() {
      this.unload();
    },
  },
});
