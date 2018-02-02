/* eslint { "object-shorthand": "off" } */

import background from '../core/base/background';
import { utils } from '../core/cliqz';
import events from '../core/events';

import telemetrySchemas from './telemetry-schemas';
import Anolysis from './anolysis';
import getSynchronizedDate from './synchronized-date';
import logger from './logger';


/* TODO - use the new kord module
 * import inject from '../core/kord/inject';
 * const controlCenter = inject.module('control-center');
 * controlCenter.windowAction(window, 'setBadge', 17);
 */


export const ENABLE_PREF = 'telemetryNoSession';
const LATEST_VERSION_USED_PREF = 'anolysisVersion';

/**
 * VERSION is used to signal major changes in Anolysis. Its purpose so far is to
 * only signal when the state of the client should be reset, which is a
 * temporary thing.
 */
const VERSION = 4;


function versionWasUpdated() {
  return utils.getPref(LATEST_VERSION_USED_PREF, null) !== VERSION;
}


function storeNewVersionInPrefs() {
  utils.setPref(LATEST_VERSION_USED_PREF, VERSION);
}


function isTelemetryEnabled() {
  return utils.getPref(ENABLE_PREF, false);
}


/**
 * This function will instantiate an Anolysis class. It will also check if the
 * internal states need to be reset (on version bump).
 */
function instantiateAnolysis(settings) {
  const anolysis = new Anolysis(settings);

  // Check if we should reset
  if (versionWasUpdated()) {
    logger.log('reset anolysis state because of update');
    return anolysis.storage.init()
      .then(() => anolysis.reset())
      .then(() => anolysis.storage.unload())
      .then(() => anolysis.unload())
      .then(() => storeNewVersionInPrefs())
      .then(() => new Anolysis(settings));
  }

  return Promise.resolve(anolysis);
}


/**
 * Manages new telemetry.
 */
export default background({
  isRunning: false,
  settings: {},

  enabled() { return true; },

  init(settings) {
    if (settings !== undefined) {
      this.settings = settings;
    }

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
          this.init(this.settings);
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

    // Used for testing
    // this.intervalTimer = utils.setInterval(
    //   () => this.actions.generateSignals(Date.now()),
    //   ONE_MINUTE);

    return instantiateAnolysis(this.settings).then((anolysis) => {
      this.anolysis = anolysis;

      // TODO
      // Register legacy telemetry signals listener. In the future this should
      // not be needed as the `utils.telemetry` function should directly call
      // the action `log` of this background (using the kord mechanism).
      this.telemetryHandler = this.events['telemetry:handleTelemetrySignal'].bind(this);
      utils.telemetryHandlers.push(this.telemetryHandler);

      return this.actions.registerSchemas(telemetrySchemas)
        .then(() => this.anolysis.init())
        .then(() => { this.isRunning = true; })
        .then(() => {
          // 1. Trigger sending of retention signals if needed
          // This can be done as soon as possible, the first time
          // the user starts the browser, at most once a day.
          //
          // 2. Then we check previous days (30 days max) to aggregate and send
          // telemetry if the user was not active. This task is async and will try to
          // not overload the browser.
          this.anolysis.sendRetentionSignals()
            .then(() => {
              logger.log('Generate aggregated signals');
              return this.anolysis.generateAnalysesSignalsFromAggregation();
            });
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
    const index = utils.telemetryHandlers.indexOf(this.telemetryHandler);
    if (index !== -1) {
      utils.telemetryHandlers.splice(index, 1);
      delete this.telemetryHandler;
    }

    this.anolysis.unload();
  },

  unload(quick) {
    if (quick === undefined) {
      // Generate uninstall signal
      // TODO: Find a way to do this, as it's hard to do it fast.
      // We need to get the GID or demographics to send with the
      // new signal + by-pass the message queue/preprocessing.
      //
      // Also, how to make sure that the message is actually sent
      // to the backend, as this is done in an async way.
    }

    this.stop();
  },

  beforeBrowserShutdown() {
  },

  events: {
    /**
     * @event telemetry:handleTelemetrySignal
     * @param data
     */
    'telemetry:handleTelemetrySignal'(data) {
      if (!this.isRunning) return;

      // No telemetry in private windows
      if (data.type !== 'environment' && utils.isPrivateMode()) {
        return;
      }

      this.actions.handleTelemetrySignal(data);
    },

    /**
     * Monitor preference changes in about:config and check if we should
     * enable or disable the telemetry module.
     */
    'prefchange'(pref) {
      if (pref !== ENABLE_PREF) return;

      if (isTelemetryEnabled()) {
        this.init(this.settings);
      } else {
        this.stop();
      }
    },
  },

  actions: {
    registerSchemas(schemas) {
      return Promise.resolve()
        .then(() => this.anolysis.registerSchemas(schemas));
    },

    handleTelemetrySignal(...args) {
      if (!this.anolysis) {
        return Promise.resolve();
      }
      return this.anolysis.handleTelemetrySignal(...args);
    },
  },
});
