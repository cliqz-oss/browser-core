import prefs from '../core/prefs';

export function isTelemetryEnabled() {
  return prefs.get('telemetry', true);
}
