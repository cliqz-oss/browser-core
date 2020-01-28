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
 * @param {string} url
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
 * First check the global blacklist, then check the offer's blacklist.
 * The global blacklist is overridden
 * if the offer is set to trigger on the advertiser's website
 * and the url is that of the advertiser's website
 * and the offer's destination real estates include 'offers-cc'.
 * The given callback is called when an offer is filtered out.
 *
 * @param {Offer} offer
 * @param {BlackListSpec} context
 * a context object with the following properties:
 *   * {UrlData} urlData
 *   * {OffersHandler} offersHandler
 *   * {(offer: Offer, actionID: string) => void} offerIsFilteredOutCb
 *   called when an offer is filtered out
 *
 * @return {boolean} `true` when the given `offer` is not blacklisted
 * in either the global or the offer's own blacklist,
 * or, if it is blacklisted in the global blacklist,
 * when the offer is set to trigger on the advertiser's website
 * and the url is that of the advertiser's website
 * and the offer's destination real estates include 'offers-cc'.
 * `false` otherwise.
 */
function passBlacklist(offer, { urlData, offersHandler, offerIsFilteredOutCb }) {
  const url = urlData.getRawUrl();
  if (offersHandler.isUrlBlacklisted(url) && !shouldTriggerOnAdvertiser(offer, url)) {
    offerIsFilteredOutCb(offer, ActionID.AID_OFFER_FILTERED_GLOBAL_BLACKLIST);
    return false;
  }
  const isInBlacklist = () => offer.hasBlacklistPatterns()
    && offer.blackListPatterns.match(urlData.getPatternRequest());
  if (isInBlacklist()) {
    offerIsFilteredOutCb(offer, ActionID.AID_OFFER_FILTERED_OFFER_BLACKLIST);
    return false;
  }
  return true;
}

//
//
//
export default class SoftFilter extends OfferJob {
  constructor() {
    super('SoftFilter');
  }

  process(offers, context) {
    const result = offers
      .filter(shouldShowInFreshInstalled)
      .filter(offer => passBlacklist(offer, context))
      .filter(offer => !shouldFilterOffer(offer, context.offersDB, context.offerIsFilteredOutCb));
    return Promise.resolve(result);
  }
}
