/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../prefs';
import { subscribe } from '../events';
import { isPrivateMode, getWindow } from '../browser';
import inject from '../kord/inject';
import EventEmitter from '../event-emitter';
import Logger from '../logger';
import { deadline } from '../decorators';
import { isDesktopBrowser } from '../platform';

const logger = Logger.get('telemetry', {
  level: 'log',
  prefix: '[telemetry]',
});

class TelemetryManager extends EventEmitter {
  constructor() {
    super([
      'enabled',
      'disabled',
    ]);
  }
}

class TelemetrySettingWatcher {
  static DEFAULT_SETTING = true;

  isTelemetryEnabled = TelemetrySettingWatcher.DEFAULT_SETTING;

  constructor(hostSettings) {
    this.prefs = hostSettings;
    // on Android different pref is in use
    this.prefName = isDesktopBrowser ? 'datareporting.healthreport.uploadEnabled' : 'toolkit.telemetry.enabled';
  }

  async init() {
    this.isTelemetryEnabled = await this.prefs.get(
      this.prefName,
      TelemetrySettingWatcher.DEFAULT_SETTING,
    );
    this.prefs.addListener(this._listener, this.prefName);
  }

  unload() {
    this.prefs.removeListener(this._listener);
  }

  _listener = async () => {
    this.isTelemetryEnabled = await this.prefs.get(
      this.prefName,
      TelemetrySettingWatcher.DEFAULT_SETTING,
    );
    if (this.onUpdate) {
      this.onUpdate();
    }
  };
}

export async function service(app) {
  const hostSettings = app.services['host-settings'];
  await hostSettings.isReady();

  const telemetrySettingWatcher = new TelemetrySettingWatcher(hostSettings.api);
  await telemetrySettingWatcher.init();

  function isBrowserTelemetryEnabled() {
    return telemetrySettingWatcher.isTelemetryEnabled;
  }

  function isTelemetryEnabled() {
    if (!isBrowserTelemetryEnabled()) {
      logger.log('Telemetry disabled because of user opt-out');
      return false;
    }

    const telemetryPref = prefs.get('telemetry', true);
    if (telemetryPref !== true) {
      logger.log('Telemetry disabled because "telemetry" pref is false');
    }

    return telemetryPref;
  }

  let enabled = isTelemetryEnabled();
  const telemetryManager = new TelemetryManager();

  const updateTelemetryState = () => {
    const newState = isTelemetryEnabled();
    if (newState !== enabled) {
      enabled = newState;
      if (enabled) {
        telemetryManager.emit('enabled');
      } else {
        telemetryManager.emit('disabled');
      }
    }
  };

  telemetrySettingWatcher.onUpdate = updateTelemetryState;

  // Listen to pref changed regarding telemetry.
  const cliqzPrefListener = subscribe('prefchange', (pref) => {
    if (pref === 'telemetry') {
      updateTelemetryState();
    }
  });

  service.unload = () => {
    telemetrySettingWatcher.unload();
    cliqzPrefListener.unsubscribe();
  };

  // Keep track of all schemas which were registered into Anolysis. We need to
  // keep this state in case telemetry is disabled then enabled again. Since any
  // module can register schemas, we cannot expect they will re-register them on
  // every telemetry reload.
  const schemas = new Map();

  const providers = new Set();
  const send = async (...args) => {
    const allProviders = [...providers];
    const results = await Promise.all(
      allProviders.map(async (provider) => {
        try {
          return (await provider.send(...args));
        } catch (error) {
          logger.error(`cannot send telemetry via provider: "${provider.name}"`, error);
          return { error };
        }
      })
    );
    return allProviders.reduce((report, provider, i) => ({
      ...report,
      [provider.name]: results[i],
    }), {});
  };

  /**
   * Telemetry service will queue all the signals until "ready".
   *
   * In this way, there is no runtime cost in early stages of
   * App lifecycle. For example: telemetry is not touching network.
   *
   * Queue also guarantees that all providers will get their signals,
   * even if they are installed slighly later.
   */
  let ready = false;
  const startupQueue = [];
  const sendTelemetry = (...args) => {
    if (!ready) {
      return new Promise((resolve) => {
        startupQueue.push({
          signal: args,
          resolver: resolve,
        });
      });
    }
    return send(...args);
  };

  // we should still start the telemetry service even in the
  // extreme case in which app start does not resolve
  deadline(app.ready(), 30000).then(() => {
    logger.log(`starting telemetry service with ${startupQueue.length} signals in the queue`);
    ready = true;
    while (startupQueue.length > 0) {
      const { signal, resolver } = startupQueue.shift();
      resolver(sendTelemetry(...signal));
    }
  });

  return {
    installProvider(provider) {
      providers.add(provider);
      if (provider.register !== undefined) {
        for (const schema of schemas.values()) {
          provider.register(schema);
        }
      }
    },
    uninstallProvider(provider) {
      providers.delete(provider);
    },
    removeListener(cb) {
      telemetryManager.unsubscribe('enabled', cb);
      telemetryManager.unsubscribe('disabled', cb);
    },
    onTelemetryEnabled(cb) {
      telemetryManager.on('enabled', cb);
    },
    onTelemetryDisabled(cb) {
      telemetryManager.on('disabled', cb);
    },
    isEnabled() {
      return enabled;
    },
    verifyStatus() {
      updateTelemetryState();
    },
    isBrowserTelemetryEnabled,
    push(payload, schemaName, instant) {
      logger.debug('signal pushed', payload, schemaName, instant);

      if (!enabled) {
        // Telemetry is currently disabled (opted-out)
        logger.log('Could not push telemetry: disabled.', schemaName, payload);
        return Promise.resolve();
      }

      // IMPORTANT: This check is only an approximation of the expected
      // behavior. The window returned by `getWindow` is only the currently
      // focused window. This means that if a private window is open in the
      // background and that telemetry is sent from it then `isPrivateMode` will
      // return false. Ideally each caller of telemetry should make sure that if
      // a window is available, the check is performed before calling
      // `telemetry.push`. The following check is simply a fallback, to catch as
      // many cases as possible (although it is not bullet-proof).
      const currentWindow = getWindow();
      if (currentWindow && isPrivateMode(currentWindow)) {
        logger.log('Could not push telemetry: private window.', schemaName, payload);
        return Promise.resolve();
      }

      return sendTelemetry(payload, schemaName, instant);
    },

    /**
     * Register one or several new telemetry schemas (metric or analysis for aggregation).
     */
    register(newSchemas) {
      for (const schema of newSchemas) {
        schemas.set(schema.name, schema);
        if (enabled) {
          for (const provider of providers) {
            if (provider.register !== undefined) {
              provider.register(schema);
            }
          }
        }
      }
    },

    unregister(newSchemas) {
      for (const schema of newSchemas) {
        schemas.delete(schema.name);
        if (enabled) {
          for (const provider of providers) {
            if (provider.unregister !== undefined) {
              provider.unregister(schema);
            }
          }
        }
      }
    },
  };
}

export default inject.service('telemetry', ['push', 'isEnabled', 'register', 'unregister']);
