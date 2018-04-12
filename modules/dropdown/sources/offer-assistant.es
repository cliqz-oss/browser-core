import prefs from '../core/prefs';

const OFFER_USER_ENABLED = 'offers2UserEnabled';
const OFFER_DROPDOWN_ENABLED = 'offersDropdownSwitch';
const OFFER_LOCATION_ENABLED = 'offers_location';
const NON_ORGANIC_OFFER_STYLE_PREF = 'myoffrz.experiments.001.style';
const ORGANIC_OFFER_STYLE_PREF = 'myoffrz.experiments.002.style';

const OFFER_STYLE_DEFAULT = 'plain';

export function isUserEnabled() {
  return prefs.get(OFFER_USER_ENABLED, true) && prefs.get(OFFER_DROPDOWN_ENABLED, false);
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
