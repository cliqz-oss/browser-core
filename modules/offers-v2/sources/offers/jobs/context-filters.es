import OfferJob from './job';
import OffersBG from '../../background';

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
  OffersBG.offersAPI.processRealEstateMessage({
    type: 'offer-action-signal',
    origin: 'processor',
    data: {
      offer_id: offer.offerObj.offer_id,
      action_id: 'filtered_by_context',
      campaign_id: offer.offerObj.campaign_id
    }
  });
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
