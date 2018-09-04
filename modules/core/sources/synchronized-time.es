import moment from '../platform/lib/moment';
import prefs from './prefs';

/**
 * Check if a `config_ts` value is available.
 */
export function isSynchronizedDateAvailable() {
  return prefs.has('config_ts');
}

export default function getSynchronizedDate() {
  if (isSynchronizedDateAvailable()) {
    return moment(prefs.get('config_ts'), 'YYYYMMDD');
  }

  return null;
}
