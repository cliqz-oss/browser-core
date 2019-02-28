/**
 * This file will contain all the "hard filters", which means all things that usually
 * will not change over the time for a given offer nor the user:
 * - location
 * - ab test
 * - real estate
 * ...
 */
import OfferJob from './job';
import { getABNumber } from '../../utils';
import ActionID from '../actions-defs';

// /////////////////////////////////////////////////////////////////////////////
//

const isInRange = (x, A, B) => (x >= A && x <= B);

// /////////////////////////////////////////////////////////////////////////////
//                    DEFINE ALL THE FILTERS HERE
// /////////////////////////////////////////////////////////////////////////////

/**
 * This method will perform all the filters for a given offer and will return
 * true or false if the offer should be removed or not (true == filtered out, false otherwise).
 * The promise will be evaluated once we get the final result on all the filters
 */
const shouldFilterOffer = async (
  offer,
  { presentRealEstates, geoChecker, categoryHandler, offerIsFilteredOutCb }
) => {
  // check the offer is valid and contains all the data we need
  const filterByValidity = () => !offer || !offer.isValid();

  // if an AB test offer, we filter out the ones that cannot be shown for this user
  const filterByABTest = () => offer.ABTestInfo
    && !isInRange(getABNumber(), offer.ABTestInfo.start, offer.ABTestInfo.end);

  // check if the targeted real estate is present on the client
  const filterByRealEstates = () => !offer.destinationRealEstates
    || !offer.destinationRealEstates.some(re => presentRealEstates.has(re));

  // check if they are geo targeted, we filter them by location
  const filterByGeo = () => offer.isGeoLocated()
    && (!geoChecker || !geoChecker.matches(offer.geoInfo));

  // check at least one category is active, if not filter
  const filterByCategories = () => offer.hasCategories()
    && !offer.categories.some(cat => categoryHandler.isCategoryActive(cat));

  // all the filters here
  const allFiltersFunctions = [
    filterByValidity,
    filterByABTest,
    filterByRealEstates,
    filterByGeo,
    filterByCategories,
  ];

  for (let i = 0; i < allFiltersFunctions.length; i += 1) {
    /* eslint-disable no-await-in-loop */
    const fn = allFiltersFunctions[i];
    const filtered = await fn();
    if (filtered) {
      offerIsFilteredOutCb(offer, `${ActionID.AID_OFFER_FILTERED_HARD_PREFIX}${fn.name}`);
      return true;
    }
  }
  return false;
};


/**
 * "Hard filters" (basically first level filters)
 */
export default class HardFilters extends OfferJob {
  constructor() {
    super('HardFilters');
  }

  /**
   * This method will filter all the offers that should be discarded for first level
   * checks. This filter basically will discard all offers that we should not for
   * any reason shown to the user:
   * TODO: add the link to the documentation here.
   * @param {object} context The context information to check if the offer should
   *                         be filtered out or not.
   * {
   *   // real estates on the client (map)
   *   presentRealEstates: Map(),
   *   // geo checker instance
   *   geoChecker: {},
   *   // the category handler to check if a category is active
   *   categoryHandler: {},
   * }
   */
  process(offerList, context) {
    // we need to iterate over all the offers here and remove all the ones that
    // are filtered out
    const offersFiltered = offerList.map(offer => shouldFilterOffer(offer, context)) || [];
    return Promise.all(offersFiltered).then((shouldFilterOfferResults) => {
      const resultOffersList = [];
      for (let i = 0; i < offerList.length; i += 1) {
        if (shouldFilterOfferResults[i] === false) {
          resultOffersList.push(offerList[i]);
        }
      }
      return Promise.resolve(resultOffersList);
    });
  }
}
