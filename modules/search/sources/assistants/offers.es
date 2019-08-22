/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../../core/prefs';

const OFFER_USER_ENABLED = 'offers2UserEnabled';
const OFFER_LOCATION_ENABLED = 'offers_location';
const NON_ORGANIC_OFFER_STYLE_PREF = 'myoffrz.experiments.001.style';
const ORGANIC_OFFER_STYLE_PREF = 'myoffrz.experiments.002.style';

const OFFER_STYLE_DEFAULT = 'plain';

export function isUserEnabled() {
  return prefs.get(OFFER_USER_ENABLED, true);
}

export function isLocationEnabled() {
  return prefs.get(OFFER_LOCATION_ENABLED, 1) === 1;
}

export function getNonOrganicOfferStyle() {
  return prefs.get(NON_ORGANIC_OFFER_STYLE_PREF, OFFER_STYLE_DEFAULT);
}

export function getOrganicOfferStyle() {
  return prefs.get(ORGANIC_OFFER_STYLE_PREF, OFFER_STYLE_DEFAULT);
}

export function getState() {
  return {
    isEnabled: isUserEnabled(),
    locationEnabled: isLocationEnabled(),
    nonOrganicStyle: getNonOrganicOfferStyle(),
    organicStyle: getOrganicOfferStyle(),
  };
}
