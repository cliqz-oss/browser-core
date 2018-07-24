import OfferJob from './job';
import logger from '../../common/offers_v2_logger';


/**
 * will return false if we have to filter the given offer and the current active
 * categories.
 * true otherwise
 */
const filterOfferByCategory = (offer, activeCategories) => {
  if (!offer.hasCategories() || offer.categories.length === 0) {
    return true;
  }
  const offerCatList = offer.categories;
  for (const catID of activeCategories) {
    for (let i = 0; i < offerCatList.length; i += 1) {
      if (catID.indexOf(offerCatList[i]) === 0) {
        // there is at least one category active for the current context and
        // the given offer
        return true;
      }
    }
  }
  // TODO: remove this debug log
  logger.debug(`Offer ${offer.uniqueID} context filtered (categories)`);
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

  process(offerList, { urlData }) {
    return Promise.resolve(offerList.filter(offer =>
      filterOfferByCategory(offer, urlData.getActivatedCategoriesIDs())));
  }
}
