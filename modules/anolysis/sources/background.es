/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import { isSynchronizedDateAvailable, getSynchronizedDateFormatted } from '../core/synchronized-time';
import prefs from '../core/prefs';
import { shouldEnableModule } from '../core/app';
import inject from '../core/kord/inject';

import Anolysis from './internals/anolysis';
import createConfig from './cliqz-config';
import logger from './internals/logger';
import SafeDate from './internals/date';

import getDemographics from './demographics';

const LATEST_VERSION_USED_PREF = 'anolysisVersion';

/**
 * VERSION is used to signal major changes in Anolysis. Its purpose so far is to
 * only signal when the state of the client should be reset, which is a
 * temporary thing.
 */
const VERSION = 7;

const telemetry = inject.service('telemetry', [
  'installProvider',
  'isEnabled',
  'onTelemetryDisabled',
  'onTelemetryEnabled',
  'push',
  'register',
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
async function instantiateAnolysis(configTs, browser, demographics, settings) {
  const date = SafeDate.fromConfig(configTs);
  const config = await createConfig(browser, demographics, settings);

  let anolysis = new Anolysis(date, config);

  // Check if we should reset
  if (versionWasUpdated()) {
    logger.log('reset anolysis state because of update');
    await anolysis.reset();
    storeNewVersionInPrefs();
    anolysis = new Anolysis(date, config);
  }

  // Check if the browser was started in automatic private mode. This
  // information is useful to understand why storage might not be available.
  const autoPrivateMode = await inject.service('host-settings', ['get']).get(
    'browser.privatebrowsing.autostart',
    false,
  );

  const isHealthy = await anolysis.init(autoPrivateMode);

  if (!isHealthy) {
    // Try to send a 'health check' metric to backend, which should be sent
    // straight away since storage is not working properly.
    await anolysis.handleTelemetrySignal(
      { state: 'broken', autoPrivateMode },
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
  requiresServices: ['cliqz-config', 'telemetry', 'pacemaker', 'session'],

  isBackgroundInitialized: false,
  anolysis: null,
  demographics: null,

  // Keeps track of arguments given to `init(...)` by `App` on initialization.
  // This is needed to ensure that Anolysis module can re-enable itself on
  // telemetry opt-out/opt-in, since we then need to invoke the `init(...)`
  // method again.
  settings: null,
  browser: null,

  async init(settings, browser) {
    logger.debug('init');

    // Prevent calling `init` two times in a row
    if (this.isBackgroundInitialized) {
      return;
    }

    this.settings = settings;
    this.browser = browser;

    // Initialize demographics only once, they will be used when creating the
    // instance of Anolysis as well as if the `getDemographics` action is called.
    if (this.demographics === null) {
      this.demographics = await getDemographics(
        inject.app.version,
        (settings.telemetry || {}).demographics,
      );
    }

    if (isSynchronizedDateAvailable() === false) {
      // If synchronized time (from `config_ts` pref) is not available, then we
      // do not start Anolysis. We used to wait for `config_ts` to be set in
      // such case, but since it is now initialized in a Service, it should
      // always be available when Anolysis is initialized.
      logger.warn('config_ts is not available. Anolysis initialization canceled');
      return;
    }

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

    try {
      // Create an instance of Anolysis and initialize it
      logger.debug('instantiate Anolysis');

      const anolysis = await instantiateAnolysis(
        getSynchronizedDateFormatted(),
        browser,
        this.demographics,
        this.settings,
      );

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

      logger.debug('register Anolysis telemetryHandler');
      this.telemetryProvider = {
        name: 'anolysis',
        send: (payload, schemaName) => {
          if (!schemaName) {
            return Promise.resolve({ error: 'no schema', payload });
          }
          return this.actions.handleTelemetrySignal(payload, schemaName);
        },
        register: (schema) => {
          this.actions.registerSchema(schema);
        },
        unregister: (schema) => {
          this.actions.unregisterSchema(schema);
        },
      };
      telemetry.installProvider(this.telemetryProvider);
    } catch (ex) {
      logger.error('Exception while init anolysis', ex);
      this.unload();
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

  isAnolysisInitialized() {
    return this.isBackgroundInitialized && this.anolysis && this.anolysis.running;
  },

  events: {
    prefchange(pref) {
      // Detect new days and trigger aggregation accordingly.
      if (pref === 'config_ts') {
        if (this.isAnolysisInitialized()) {
          // Notify anolysis that the date just changed.
          this.anolysis.onNewDay(SafeDate.fromConfig(getSynchronizedDateFormatted()));
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

    registerSchema(schema) {
      if (!this.isAnolysisInitialized()) {
        logger.error('anolysis disabled, ignoring registration', schema);
        return;
      }

      this.anolysis.register(schema);
    },

    unregisterSchema(schema) {
      if (!this.isAnolysisInitialized()) {
        logger.error('anolysis disabled, ignoring unregistration', schema);
        return;
      }

      this.anolysis.unregister(schema);
    },

    handleTelemetrySignal(msg, schemaName) {
      // When calling `telemetry.push` from `core/services`, messages will wait
      // for Anolysis module to be initialized before calling the action, so we
      // should not loose any signal.
      if (!this.isAnolysisInitialized()) {
        return Promise.reject(new Error(`Anolysis is disabled, ignoring: ${schemaName} ${JSON.stringify(msg)}`));
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
      if (this.anolysis === null) {
        return null;
      }

      return this.anolysis.currentDate.toString();
    },

    async getMetricsForDate(date) {
      if (!this.isAnolysisInitialized()) {
        return Promise.reject(new Error('Cannot call `getMetricsForDate` when Anolysis is unloaded'));
      }
      return (await this.anolysis.storage.behavior.getTypesForDate(date)).toObj();
    },

    getDemographics() {
      return this.demographics;
    },

    // Life-cycle handlers for telemetry: they allow to listen to user
    // opting-out or opting-in, either using the `telemetry` pref triggered by
    // control-center toggle or browser preferences for telemetry (using
    // host-prefs). On both even, we send a unique signal which allows us to
    // count how many users decided to opt-out or opt-into telemetry. In the
    // case of opt-out, this is the last signal that will be sent to us, and it
    // does not contain any behavioral information: we simply use it for
    // counting purposes.

    async onTelemetryEnabled() {
      if (this.isAnolysisInitialized() === false && shouldEnableModule('anolysis')) {
        await this.init(this.settings, this.browser);
        await telemetry.push({}, 'core.metric.telemetry.opt-in');
      }
    },

    async onTelemetryDisabled() {
      if (this.isAnolysisInitialized() === true) {
        try {
          await this.anolysis.handleTelemetrySignal(
            {},
            'core.metric.telemetry.opt-out',
            // By-passes the signal-queue; this option is not intended for use
            // outside of the Anolysis' module internals, but is used here to be
            // sure we can send a last 'opt-out' signal just before the module
            // is unloaded completely.
            { force: true },
          );
        } catch (ex) {
          logger.log('error while trying to send telemetry opt-out signal', ex);
        } finally {
          this.unload();
        }
      }
    },
  },
});
