import utils from '../../core/utils';
import i18n from '../../core/i18n';
import prefs from '../../core/prefs';
import CONFIG from '../../core/config';
import { isMobile } from '../../core/platform';

export const encodeSessionParams = utils.encodeSessionParams;

export const encodeLocale = () => `&locale=${i18n.PLATFORM_LOCALE || ''}`;

export const encodePlatform = () => `&platform=${(isMobile ? '1' : '0')}`;

export const encodeResultOrder = resultOrder => `&o=${encodeURIComponent(JSON.stringify(resultOrder))}`;

export const encodeCountry = backendCountry => `&country=${backendCountry}`;

const _getAdultContentFilterState = () => {
  const data = {
    conservative: 3,
    moderate: 0,
    liberal: 1
  };
  const pref = prefs.get('adultContentFilter', 'moderate');
  return data[pref];
};

export const encodeFilter = () => `&adult=${_getAdultContentFilterState()}`;

export const encodeLocation = (specifySource, lat, lng) => {
  // default geolocation 'yes' for funnelCake - 'ask' for everything else
  let locationPref = prefs.get('share_location', CONFIG.settings.geolocation || 'ask');
  if (locationPref === 'showOnce') {
    locationPref = 'ask';
  }
  let qs = `&loc_pref=${locationPref}`;

  if ((utils.USER_LAT && utils.USER_LNG) || (lat && lng)) {
    qs += [
      '&loc=',
      lat || utils.USER_LAT,
      ',',
      lng || utils.USER_LNG,
      (specifySource ? ',U' : '')
    ].join('');
  }

  return qs;
};

export const encodeWikiDedup = () => {
  // disable wikipedia deduplication on the backend side
  const doDedup = prefs.get('languageDedup', false);
  if (doDedup) return '&ddl=0';
  return '';
};
