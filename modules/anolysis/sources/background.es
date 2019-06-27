import background from '../core/base/background';
import getDemographics from '../core/demographics';
import getSynchronizedDate from '../core/synchronized-time';
import prefs from '../core/prefs';
import { shouldEnableModule } from '../core/app';
import { platformName } from '../core/platform';
import inject from '../core/kord/inject';

import Anolysis from './internals/anolysis';
import createConfig from './internals/config';
import DexieStorage from './internals/storage/dexie';
import AsyncStorage from './internals/storage/async-storage';
import logger from './internals/logger';
import { getSynchronizedDateFormatted } from './internals/synchronized-date';

const LATEST_VERSION_USED_PREF = 'anolysisVersion';

/**
 * VERSION is used to signal major changes in Anolysis. Its purpose so far is to
 * only signal when the state of the client should be reset, which is a
 * temporary thing.
 */
const VERSION = 7;

const telemetry = inject.service('telemetry', [
  'onTelemetryEnabled',
  'onTelemetryDisabled',
  'isEnabled',
  'push',
  'installProvider',
  'uninstallProvider',
]);

function versionWasUpdated() {
  return prefs.get(LATEST_VERSION_USED_PREF, null) !== VERSION;
}

function storeNewVersionInPrefs() {
  prefs.set(LATEST_VERSION_USED_PREF, VERSION);
}

/**
 * This function will instantiate an Anolysis class. It will also check if the
 * internal states need to be reset (on version bump).
 */
async function instantiateAnolysis() {
  const demographics = await getDemographics();

  // If platform is 'react-native' (platformName === 'mobile'), this means that
  // IndexedDB is not available and we should use AsyncStorage instead (on other
  // platforms this will be mocked with an in-memory storage). On all other
  // platforms (webextension, bootstrap) we use Dexie on top of IndexedDB.
  const Storage = platformName === 'mobile' ? AsyncStorage : DexieStorage;
  const config = await createConfig({ demographics, Storage });
  let anolysis = new Anolysis(config);

  // Check if we should reset
  if (versionWasUpdated()) {
    logger.log('reset anolysis state because of update');
    await anolysis.reset();
    storeNewVersionInPrefs();
    anolysis = new Anolysis(config);
  }

  const isHealthy = await anolysis.init();

  if (!isHealthy) {
    telemetry.push({ type: 'anolysis.health_check' });

    // Try to send a 'health check' metric to backend, which should be sent
    // straight away since storage is not working properly.
    await anolysis.handleTelemetrySignal(
      { state: 'broken' },
      'metrics.anolysis.health.storage',
      { force: true },
    );

    throw new Error('Anolysis is not healthy');
  }

  return anolysis;
}

/**
 * Manages new telemetry.
 */
export default background({
  // to be able to read the config prefs
  requiresServices: ['cliqz-config', 'session', 'telemetry', 'pacemaker'],

  isBackgroundInitialized: false,
  app: null,
  settings: null,
  anolysis: null,

  async init(settings, app) {
    logger.debug('init');

    // Prevent calling `init` two times in a row
    if (this.isBackgroundInitialized) {
      return;
    }

    if (getSynchronizedDate() === null) {
      // If synchronized time (from `config_ts` pref) is not available, then we
      // do not start Anolysis. We used to wait for `config_ts` to be set in
      // such case, but since it is now initialized in a Service, it should
      // always be available when Anolysis is initialized.
      logger.warn('config_ts is not available. Anolysis initialization canceled');
      return;
    }

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

    // Start initialization of Anolysis, since this is an async process, we set
    // this flag so that we can tell of Anolysis is in the process of
    // initialization.
    this.isBackgroundInitialized = true;

    // TODO - send ping_anolysis signal with legacy telemetry system
    // This is only meant for testing purposes and will be remove in
    // the future.
    telemetry.push({
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
      // not be needed as we are now using the `telemetry` service to send
      // telemetry through Anolysis:
      // ```js
      // import telemetry from 'anolysis/services/telemetry';
      //
      // telemetry.push({}, 'schema_name');
      // ```
      logger.debug('register Anolysis telemetryHandler');
      this.telemetryProvider = {
        name: 'anolysis',
        send: (payload, schemaName) => {
          if (!schemaName) {
            return Promise.resolve({ error: 'no schema' });
          }
          return this.actions.handleTelemetrySignal(payload, false, schemaName);
        },
      };
      telemetry.installProvider(this.telemetryProvider);

      // Start aggregations as soon as the extension is loaded.
      logger.debug('trigger aggregations');
      this.anolysis.onNewDay(prefs.get('config_ts'));

      // TODO - send ping_anolysis signal with legacy telemetry system This is
      // only meant for testing purposes and will be remove in the future.
      telemetry.push({
        type: 'anolysis.start_end',
      });
    } catch (ex) {
      // TODO - send ping_anolysis signal with legacy telemetry system
      // This is only meant for testing purposes and will be remove in
      // the future.
      logger.error('Exception while init anolysis', ex);
      this.unload();
      telemetry.push({
        type: 'anolysis.start_exception',
        exception: `${ex}`,
      });
    }
  },

  unload() {
    logger.log('unloading');
    this.isBackgroundInitialized = false;

    telemetry.uninstallProvider(this.telemetryProvider);

    if (this.anolysis) {
      logger.debug('unloading Anolysis');
      this.anolysis.unload();
      this.anolysis = null;
    }
  },

  beforeBrowserShutdown() {},

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
    isAnolysisInitialized() {
      return this.isAnolysisInitialized();
    },

    getSignalDefinitions() {
      return [...this.anolysis.availableDefinitions.entries()];
    },

    handleTelemetrySignal(msg, instantPush, schemaName) {
      // When calling `telemetry.push` from `core/services`, messages will wait
      // for Anolysis module to be initialized before calling the action, so we
      // should not loose any signal.
      if (!this.isAnolysisInitialized()) {
        return Promise.reject(new Error(`Anolysis is disabled, ignoring: ${schemaName} ${JSON.stringify(msg)}`));
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

    getDate() {
      return getSynchronizedDateFormatted();
    },

    getGID() {
      if (!this.isAnolysisInitialized()) {
        return Promise.reject(new Error('Cannot call `getGID` when Anolysis is unloaded'));
      }
      return this.anolysis.gidManager.getGID();
    },

    async getMetricsForDate(date) {
      if (!this.isAnolysisInitialized()) {
        return Promise.reject(new Error('Cannot call `getMetricsForDate` when Anolysis is unloaded'));
      }
      return (await this.anolysis.storage.behavior.getTypesForDate(date)).toObj();
    },

    getLastGIDUpdateDate() {
      if (!this.isAnolysisInitialized()) {
        return Promise.reject(new Error('Cannot call `getLastGIDUpdateDate` when Anolysis is unloaded'));
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
