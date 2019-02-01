import OfferJob from './job';
import ActionID from '../actions-defs';
/**
 * @class ContextFilter
 */

/**
 * will return false if we have to filter the given offer and the current active
 * categories.
 * true otherwise
 *
 * @method filterOfferByCategory
 * @param {Offer} offer
 * @param {CategoriesMatchTraits} activeCategoriesMatches
 * @param {(Offer, string) => ()} offerIsFilteredOutCb
 */
const filterOfferByCategory = (offer, activeCategoriesMatches, offerIsFilteredOutCb) => {
  if (!offer.hasCategories() || offer.categories.length === 0) {
    return true;
  }
  const offerCatList = offer.categories;
  if (activeCategoriesMatches.haveCommonWith(offerCatList)) {
    return true;
  }
  offerIsFilteredOutCb(offer, ActionID.AID_OFFER_FILTERED_CONTEXT);
  return false;
};

/**
 * This job will filter offers that should not be shown for the current context
 * (for example if the offer had categories associated and the current url
 *  didnt activate any of them)
 */
export default class ContextFilter extends OfferJob {
  constructor() {
    super('ContextFilter');
  }

  /**
   * @param {BackendOffer[]}
   * @param {UrlData} urlData
   */
  process(offerList, { urlData, offerIsFilteredOutCb }) {
    return Promise.resolve(offerList.filter(offer =>
      filterOfferByCategory(offer, urlData.getCategoriesMatchTraits(), offerIsFilteredOutCb)));
  }
}
