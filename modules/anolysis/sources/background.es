/* eslint { "object-shorthand": "off" } */

import background from '../core/base/background';
import events from '../core/events';
import getDemographics from '../core/demographics';
import getSynchronizedDate from '../core/synchronized-time';
import prefs from '../core/prefs';
import { utils } from '../core/cliqz';

import Anolysis from './internals/anolysis';
import Config from './internals/config';
import Storage from './internals/storage/dexie';
import logger from './internals/logger';

import signalDefinitions from './telemetry-schemas';


export const ENABLE_PREF = 'telemetryNoSession';
const LATEST_VERSION_USED_PREF = 'anolysisVersion';

/**
 * VERSION is used to signal major changes in Anolysis. Its purpose so far is to
 * only signal when the state of the client should be reset, which is a
 * temporary thing.
 */
const VERSION = 6;


function versionWasUpdated() {
  return prefs.get(LATEST_VERSION_USED_PREF, null) !== VERSION;
}


function storeNewVersionInPrefs() {
  prefs.set(LATEST_VERSION_USED_PREF, VERSION);
}


function isTelemetryEnabled() {
  return prefs.get(ENABLE_PREF, false);
}


/**
 * This function will instantiate an Anolysis class. It will also check if the
 * internal states need to be reset (on version bump).
 */
function instantiateAnolysis(demographics) {
  const config = new Config({ demographics, Storage });
  const anolysis = new Anolysis(config);

  // Check if we should reset
  if (versionWasUpdated()) {
    logger.log('reset anolysis state because of update');
    return anolysis.reset()
      .then(() => storeNewVersionInPrefs())
      .then(() => new Anolysis(config));
  }

  return Promise.resolve(anolysis);
}


/**
 * Manages new telemetry.
 */
export default background({
  // to be able to read the config prefs
  requiresServices: ['cliqz-config'],

  isRunning: false,

  enabled() { return true; },

  init() {
    if (!isTelemetryEnabled()) {
      return Promise.resolve();
    }

    if (getSynchronizedDate() === null) {
      // TODO - temporary signal for debugging purpose. This allows us to detect
      // users not having anolysis enabled because `config_ts` is not available.
      utils.telemetry({
        type: 'anolysis.no_sync_time_available',
      });

      // If `config_ts` arrives later, we can delay the loading of anolysis
      this.onPrefChange = events.subscribe('prefchange', (pref) => {
        if (pref === 'config_ts') {
          this.onPrefChange.unsubscribe();
          this.onPrefChange = undefined;

          // Init anolysis
          this.init();
        }
      });
    } else {
      // Initialize the module - we only do that if a sync date is available

      // TODO - send ping_anolysis signal with legacy telemetry system
      // This is only meant for testing purposes and will be remove in
      // the future.
      utils.telemetry({
        type: 'anolysis.start_init',
      });

      return this.start()
        .then(() => {
          // TODO - send ping_anolysis signal with legacy telemetry system
          // This is only meant for testing purposes and will be remove in
          // the future.
          utils.telemetry({
            type: 'anolysis.start_end',
          });
        })
        .catch((ex) => {
          // TODO - send ping_anolysis signal with legacy telemetry system
          // This is only meant for testing purposes and will be remove in
          // the future.
          logger.error('Exception while init anolysis', ex);
          utils.telemetry({
            type: 'anolysis.start_exception',
            exception: `${ex}`,
          });
        });
    }

    return Promise.resolve();
  },

  start() {
    if (this.isRunning) return Promise.resolve();

    return getDemographics().then(instantiateAnolysis).then((anolysis) => {
      this.anolysis = anolysis;

      // TODO
      // Register legacy telemetry signals listener. In the future this should
      // not be needed as the `utils.telemetry` function should directly call
      // the action `log` of this background (using the kord mechanism).
      utils.telemetryHandlers.push(this.actions.handleTelemetrySignal);

      return this.actions.registerSignalDefinitions(signalDefinitions)
        .then(() => this.anolysis.init())
        .then(() => { this.isRunning = true; })
        .then(() => {
          this.anolysis.onNewDay(prefs.get('config_ts'));
        });
    });
  },

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.onPrefChange) {
      this.onPrefChange.unsubscribe();
      this.onPrefChange = undefined;
    }

    // TODO - this will be removed when the telemetry function makes use of this
    // module exclusively.
    // Unsubscribe telemetry listener
    const index = utils.telemetryHandlers.indexOf(this.actions.handleTelemetrySignal);
    if (index !== -1) {
      utils.telemetryHandlers.splice(index, 1);
    }

    this.anolysis.unload();
  },

  unload() {
    this.stop();
  },

  beforeBrowserShutdown() {
  },

  events: {
    /**
     * Monitor preference changes in about:config and check if we should
     * enable or disable the telemetry module.
     */
    'prefchange'(pref) {
      if (pref === 'config_ts') {
        if (this.anolysis && this.isRunning) {
          // Notify anolysis that the date just changed.
          this.anolysis.onNewDay(prefs.get('config_ts'));
        }
      } else if (pref === ENABLE_PREF) {
        if (isTelemetryEnabled()) {
          this.init();
        } else {
          this.stop();
        }
      }
    },
  },

  actions: {
    getSignalDefinitions() {
      return [...this.anolysis.availableDefinitions.values()];
    },

    registerSignalDefinitions(schemas) {
      if (!this.anolysis) {
        return Promise.resolve();
      }

      return Promise.resolve()
        .then(() => this.anolysis.registerSignalDefinitions(schemas));
    },

    handleTelemetrySignal(msg, instantPush, schemaName) {
      // TODO - this could be an issue if signals are sent before Anolysis is
      // fully initialized. Maybe we could have an in-memory buffer to keep
      // early signal safe, then push them to anolysis when module is enabled.
      if (!this.isRunning || !this.anolysis) {
        return Promise.resolve();
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
        if (this.anolysis && this.isRunning) {
          logger.error('handleTelemetrySignal', ex, msg, schemaName);
        }
      });
    },

    getGID() {
      if (!this.isRunning || !this.anolysis) {
        return Promise.resolve();
      }
      return Promise.resolve()
        .then(() => this.anolysis.gidManager.getGID());
    },

    getLastGIDUpdateDate() {
      return this.anolysis.gidManager.getLastGIDUpdateDate();
    },

    getDemographics() {
      return getDemographics();
    },
  },
});
