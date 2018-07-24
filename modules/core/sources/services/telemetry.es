import inject from '../kord/inject';
import prefs from '../prefs';
import { isCliqzBrowser } from '../platform';
import { subscribe } from '../events';
import EventEmitter from '../event-emitter';
import Logger from '../logger';

const logger = Logger.get('core', {
  level: 'log',
  prefix: '[telemetry]',
});

function isTelemetryEnabled() {
  // Anolysis is disabled if the healthreport is turned off in Cliqz Browser.
  if (isCliqzBrowser && prefs.get('uploadEnabled', true, 'datareporting.healthreport.') !== true) {
    return false;
  }

  return prefs.get('telemetry', true);
}


class TelemetryManager extends EventEmitter {
  constructor() {
    super([
      'enabled',
      'disabled',
    ]);
  }
}


export const service = function service() {
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

  // Inject Anolysis to be used by `push`.
  const anolysis = inject.module('anolysis');

  return {
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
    push(payload, schemaName) {
      if (!enabled) {
        // Telemetry is currently disabled (opted-out)
        logger.log('Could not push telemetry: disabled.', schemaName, payload);
        return Promise.resolve();
      }

      // Send telemetry signal using Anolysis
      return anolysis.action('handleTelemetrySignal', payload, false, schemaName);
    },
  };
};

export default inject.service('telemetry');
