import moment from '../platform/lib/moment';
import prefs from './prefs';

export default function getSynchronizedDate() {
  const formatted = prefs.get('config_ts', null);
  if (formatted !== null) {
    const year = formatted.substr(0, 4);
    const month = formatted.substr(4, 2);
    const day = formatted.substr(6, 2);
    return moment(`${year}-${month}-${day}`, 'YYYY-MM-DD');
  }

  return null;
}
