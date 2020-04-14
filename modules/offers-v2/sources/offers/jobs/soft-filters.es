import OfferJob from './job';
import { getLatestOfferInstallTs, isDeveloper, timestampMS } from '../../utils';
import shouldFilterOffer from '../soft-filter';
import ActionID from '../actions-defs';
import { PAGE_IMPRESSION_MONITOR_TYPE } from '../../common/constant';
import { matchUrl } from '../../common/pattern-utils';

//
// If user have just installed the extension, ignore non-targeted
// offers, except in development version.
//
const FRESH_INSTALL_THRESHOLD_SECS = 45 * 60; // 45 mins

const isFreshInstalled = () => {
  if (isDeveloper()) {
    return false;
  }

  const timeSinceInstallSecs = (timestampMS() - getLatestOfferInstallTs()) / 1000;
  return timeSinceInstallSecs < FRESH_INSTALL_THRESHOLD_SECS;
};

function shouldShowInFreshInstalled(offer) {
  return offer.isTargeted() || !isFreshInstalled();
}

/**
 * @param {Offer} offer
 * @param {string|UrlData} url
 * @return {boolean} `true` when the given `offer`'s destination real estates
 * include `offers-cc` and its `trigger_on_advertiser` property is `true`,
 * and when the given `url` matches this offer's page impression
 * monitor patterns if defined,
 * `false` otherwise
 */
export function shouldTriggerOnAdvertiser(offer, url = '') {
  return offer.shouldTriggerOnAdvertiser()
    && offer.destinationRealEstates.includes('offers-cc')
    && matchUrl(offer.getMonitorPatterns(PAGE_IMPRESSION_MONITOR_TYPE), url);
}

/**
 * @param {(...args: any[]) => void} effect
 * @return {((offer: Offer) => boolean) => ((offer: Offer) => boolean)} decorator
 * that extends a given predicate such that the given `effect` is called
 * whenever the predicate returns `false`.
 */
const tapOnFalse = effect => predicate => (...args) => {
  if (predicate(...args)) {
    return true;
  }
  effect(...args);
  return false;
};

/**
 * predicate factory.
 * @param {OfferJobContext} context
 * @return {((offer: Offer) => boolean)|null} `null` when the given `urlData`
 * is not on the global blacklist,
 * or else a predicate with side-effect that only returns `true`
 * for offers that should trigger on the given blacklisted `urlData`.
 * as side-effect, the predicate calls the given `offerIsFilteredOutCb`
 * for excluded offers.
 */
function excludeGlobalBlacklist({ offersHandler, offerIsFilteredOutCb, urlData }) {
  const url = urlData.getRawUrl();
  if (!offersHandler.isUrlBlacklisted(url)) {
    return null;
  }

  const notifyGlobalBlacklistHit = offer =>
    offerIsFilteredOutCb(offer, ActionID.AID_OFFER_FILTERED_GLOBAL_BLACKLIST);
  const withNotifyGlobalBlacklistHit = tapOnFalse(notifyGlobalBlacklistHit);

  return withNotifyGlobalBlacklistHit(offer => shouldTriggerOnAdvertiser(offer, urlData));
}

/**
 * predicate factory.
 * @param {OfferJobContext} context
 * @return {(offer: Offer) => boolean} predicate with side-effect
 * that returns `true` for offers for which the given `urlData` does not match their blacklist
 * if any.
 * as side-effect, the predicate calls the given `offerIsFilteredOutCb`
 * for excluded offers.
 */
function excludeOfferBlacklist({ offerIsFilteredOutCb, urlData }) {
  const notifyOfferBlacklistHit = offer =>
    offerIsFilteredOutCb(offer, ActionID.AID_OFFER_FILTERED_OFFER_BLACKLIST);
  const withNotifyOfferBlacklistHit = tapOnFalse(notifyOfferBlacklistHit);

  const isNotInOfferBlacklist = offer => !offer.hasBlacklistPatterns()
    || !offer.blackListPatterns.match(urlData.getPatternRequest());

  return withNotifyOfferBlacklistHit(
    offer => isNotInOfferBlacklist(offer) || shouldTriggerOnAdvertiser(offer, urlData)
  );
}

//
//
//
export default class SoftFilter extends OfferJob {
  constructor() {
    super('SoftFilter');
  }

  process(offers, context) {
    const { offersDB, offerIsFilteredOutCb } = context;
    const softFilter = offer => !shouldFilterOffer(offer, offersDB, offerIsFilteredOutCb);

    const filters = [
      shouldShowInFreshInstalled,
      excludeGlobalBlacklist(context), // may be `false`
      excludeOfferBlacklist(context),
      softFilter
    ];

    const applyFilter = (offersList, filter) => offersList.filter(filter);
    const result = filters.filter(Boolean).reduce(applyFilter, offers);
    return Promise.resolve(result);
  }
}
