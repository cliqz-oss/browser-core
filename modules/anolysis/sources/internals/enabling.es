
import prefs from '../../core/prefs';
import { isCliqzBrowser } from '../../core/platform';

export const ENABLE_PREF = 'telemetryNoSession';


export function isTelemetryEnabled() {
  // Anolysis is disabled if the healthreport is turned off in Cliqz Browser.
  if (isCliqzBrowser && prefs.get('uploadEnabled', true, 'datareporting.healthreport.') !== true) {
    return false;
  }

  return prefs.get(ENABLE_PREF, false) && prefs.get('telemetry', true);
}
