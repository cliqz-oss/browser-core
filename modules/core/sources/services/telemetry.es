import prefs from '../prefs';
import { isDesktopBrowser, isOnionModeFactory } from '../platform';
import { subscribe } from '../events';
import { isPrivateMode, getWindow } from '../browser';
import inject from '../kord/inject';
import EventEmitter from '../event-emitter';
import Logger from '../logger';
import { deadline } from '../decorators';

const logger = Logger.get('telemetry', {
  level: 'log',
  prefix: '[telemetry]',
});

const isOnionMode = isOnionModeFactory(prefs);

function isBrowserTelemetryEnabled() {
  // This check uses 'host prefs' which are present in Cliqz Browsers only.
  // In non Cliqz products like Chrome or Firefox the default value will be used.
  return isDesktopBrowser
    ? prefs.get('uploadEnabled', true, 'datareporting.healthreport.')
    // on Android different pref is in use
    : prefs.get('enabled', true, 'toolkit.telemetry.');
}

function isTelemetryEnabled() {
  if (!isBrowserTelemetryEnabled()) {
    logger.log('Telemetry disabled because of user opt-out');
    return false;
  }

  if (isOnionMode()) {
    logger.log('Telemetry disabled because of TOR mode');
    return false;
  }

  const telemetryPref = prefs.get('telemetry', true);
  if (telemetryPref !== true) {
    logger.log('Telemetry disabled because "telemetry" pref is false');
  }

  return telemetryPref;
}


class TelemetryManager extends EventEmitter {
  constructor() {
    super([
      'enabled',
      'disabled',
    ]);
  }
}

export function service(app) {
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

  // Listen to pref changed regarding telemetry.
  const cliqzPrefListener = subscribe('prefchange', (pref) => {
    if (pref === 'telemetry') {
      updateTelemetryState();
    }
  });

  const healthReportPrefListener = subscribe('healthReportChange', () => {
    updateTelemetryState();
  });

  service.unload = () => {
    cliqzPrefListener.unsubscribe();
    healthReportPrefListener.unsubscribe();
  };

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
  };
}

export default inject.service('telemetry', ['push', 'isEnabled']);
