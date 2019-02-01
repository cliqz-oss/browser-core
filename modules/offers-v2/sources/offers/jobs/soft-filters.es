import OfferJob from './job';
import prefs from '../../../core/prefs';
import { getLatestOfferInstallTs, timestampMS } from '../../utils';
import shouldFilterOffer from '../soft-filter';
import ActionID from '../actions-defs';

//
// If user have just installed the extension, ignore non-targeted
// offers, except in development version.
//
const FRESH_INSTALL_THRESHOLD_SECS = 45 * 60; // 45 mins

const isFreshInstalled = () => {
  if (prefs.get('offersDevFlag', false)) {
    return false;
  }

  const timeSinceInstallSecs = (timestampMS() - getLatestOfferInstallTs()) / 1000;
  return timeSinceInstallSecs < FRESH_INSTALL_THRESHOLD_SECS;
};

function shouldShowInFreshInstalled(offer) {
  return offer.isTargeted() || !isFreshInstalled();
}

//
// First check the global blacklist, then check the offer's blacklist
//
function passBlacklist(offer, { urlData, offersHandler, offerIsFilteredOutCb }) {
  if (offersHandler.isUrlBlacklisted(urlData.getRawUrl())) {
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
