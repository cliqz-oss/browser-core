import config from '../../core/config';
import extMessaging from '../../platform/ext-messaging';

export function sendTelemetry(...args) {
  extMessaging.sendMessage(config.settings.telemetryExtensionId, {
    moduleName: 'anolysis',
    action: 'handleTelemetrySignal',
    args,
  });
}

export default function service() {
  return {
    removeListener() {
    },
    onTelemetryEnabled() {
    },
    onTelemetryDisabled() {
    },
    isEnabled() {
      return true;
    },
    push(payload, schemaName) {
      if (!config.settings.telemetryExtensionId) {
        return;
      }

      sendTelemetry(payload, false, schemaName);
    },
  };
}
