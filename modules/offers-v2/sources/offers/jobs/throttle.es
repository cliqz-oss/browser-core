import LRU from '../../../core/LRU';
import OffersConfigs from '../../offers_configs';
import { isDeveloper } from '../../utils';
import ActionID from '../actions-defs';
import OfferJob from './job';

const SILENT_OFFER_NOTIF_TYPE = 'silent';
const TOOLTIP_OFFER_NOTIF_TYPE = 'tooltip';

export const THROTTLE_PER_DOMAIN = 1;
export const THROTTLE_IGNORE_DOMAIN = 0;

function containsPopupRealEstate(estates) {
  return estates.includes('offers-cc') || estates.includes('ghostery');
}

class DegeneratedMap {
  constructor() { this.value = 0; }

  get() { return this.value; }

  set(_, value) { this.value = value; }
}

/**
 * Do not bombard an user with offers. Force a delay between offer appearances.
 *
 * - do nothing in developer mode
 * - ignore "silent" offers
 * - two exclusive modes: throttle per-domain or ignoring domains
 */
export default class Throttle extends OfferJob {
  constructor(mode) {
    super('Throttle');
    this.lastTsPerDomain = mode === THROTTLE_PER_DOMAIN
      ? new LRU(16)
      : new DegeneratedMap();
  }

  /**
   * Remember the matched domain.
   * @param {Offer} offer
   * @param {string} domain
   */
  onTriggerOffer(offer, domain) {
    const dest = offer.destinationRealEstates;
    if (!containsPopupRealEstate(dest)) {
      return;
    }
    const { offer_data: { ui_info: uiInfo = {} } = {} } = offer.offerObj;
    const { notif_type: notifType = 'pop-up' } = uiInfo;
    if (![SILENT_OFFER_NOTIF_TYPE, TOOLTIP_OFFER_NOTIF_TYPE].includes(notifType)) {
      this.lastTsPerDomain.set(domain, Date.now());
    }
  }

  process(offerList, { offerIsFilteredOutCb = () => {}, urlData: { domain = '' } = {} } = {}) {
    if (isDeveloper()) {
      return offerList;
    }
    const throttleMs = OffersConfigs.THROTTLE_PUSH_TO_REWARD_BOX_SECS * 1000;
    const lastRewardBoxTs = this.lastTsPerDomain.get(domain) || 0;
    if (Date.now() - lastRewardBoxTs >= throttleMs) {
      return offerList;
    }
    return offerList.filter((offer) => {
      if (!containsPopupRealEstate(offer.destinationRealEstates)) {
        return true;
      }
      offerIsFilteredOutCb(offer, ActionID.AID_OFFER_FILTERED_THROTTLE);
      return false;
    });
  }
}
