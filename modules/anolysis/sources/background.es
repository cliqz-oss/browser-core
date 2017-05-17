/* eslint { "object-shorthand": "off" } */

import background from 'core/base/background';
import { utils } from 'core/cliqz';


import telemetrySchemas from 'anolysis/telemetry-schemas';
import Anolysis from 'anolysis/anolysis';
import getSynchronizedDate from 'anolysis/synchronized-date';


/* TODO - use the new kord module
 * import inject from '../core/kord/inject';
 * const controlCenter = inject.module('control-center');
 * controlCenter.windowAction(window, 'setBadge', 17);
 */


const ENABLE_PREF = 'telemetryNoSession';


function isTelemetryEnabled() {
  return utils.getPref(ENABLE_PREF, true);
}


/**
 * Manages new telemetry.
 */
export default background({
  enabled() { return true; },

  init(settings) {
    this.isRunning = false;
    this.settings = settings;

    // Initialize the module - we only do that if a sync date is available
    if (isTelemetryEnabled() && getSynchronizedDate() !== null) {
      return this.start();
    }
    return Promise.resolve();
  },

  start() {
    if (this.isRunning) return Promise.resolve();

    // Used for testing
    // this.intervalTimer = utils.setInterval(
    //   () => this.actions.generateSignals(Date.now()),
    //   ONE_MINUTE);
    this.anolysis = new Anolysis(this.settings);

    // TODO
    // Register legacy telemetry signals listener. In the future this should
    // not be needed as the `utils.telemetry` function should directly call
    // the action `log` of this background (using the kord mechanism).
    this.telemetryHandler = this.events['telemetry:handleTelemetrySignal'].bind(this);
    utils.telemetryHandlers.push(this.telemetryHandler);

    // TODO - send ping_anolysis signal with legacy telemetry system
    // This is only meant for testing purposes and will be remove in
    // the future.
    utils.telemetry({
      type: 'anolysis_ping',
    }, true /* force push */);

    return this.anolysis.init()
      .then(() => { this.actions.registerSchemas(telemetrySchemas); })
      .then(() => {
        this.isRunning = true;
        utils.log('started', 'anon');
      });
  },

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    // TODO - this will be removed when the telemetry function makes use of this
    // module exclusively.
    // Unsubscribe telemetry listener
    const index = utils.telemetryHandlers.indexOf(this.telemetryHandler);
    if (index > -1) {
      utils.telemetryHandlers.splice(index, 1);
      delete this.telemetryHandler;
    }

    this.anolysis.stop();

    utils.log('stopped', 'anon');
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
      if (data.type !== 'environment' && utils.isPrivate()) return;

      this.actions.handleTelemetrySignal(data);
    },

    /**
     * Monitor preference changes in about:config and check if we should
     * enable or disable the telemetry module.
     */
    'prefchange'(pref) {
      if (pref !== ENABLE_PREF) return;

      if (utils.getPref(ENABLE_PREF, false)) {
        this.start();
      } else {
        this.stop();
      }
    },
  },

  actions: {
    registerSchemas(schemas) {
      return this.anolysis.registerSchemas(schemas);
    },

    handleTelemetrySignal(signal, schemaName) {
      if (!this.anolysis) {
        return null;
      }
      return this.anolysis.handleTelemetrySignal(signal, schemaName);
    },
  },
});
