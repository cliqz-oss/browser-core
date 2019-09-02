/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import i18n from '../../core/i18n';
import prefs from '../../core/prefs';
import CONFIG from '../../core/config';
import inject from '../../core/kord/inject';
import { isMobile } from '../../core/platform';

const geolocationService = inject.service('geolocation', ['getGeolocation']);

export const encodeSessionParams = () => inject.service('search-session', ['encodeSessionParams']).encodeSessionParams();

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

export const encodeLocation = (lat, lng) => {
  // default geolocation 'yes' for funnelCake - 'ask' for everything else
  let locationPref = prefs.get('share_location', CONFIG.settings.geolocation || 'ask');
  if (locationPref === 'showOnce') {
    locationPref = 'ask';
  }
  let qs = `&loc_pref=${locationPref}`;

  const { latitude, longitude } = geolocationService.getGeolocation();
  if ((latitude && longitude) || (lat && lng)) {
    qs += `&loc=${latitude || lat},${longitude || lng},U`;
  }

  return qs;
};
