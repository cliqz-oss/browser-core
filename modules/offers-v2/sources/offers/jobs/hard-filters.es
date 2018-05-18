/**
 * This file will contain all the "hard filters", which means all things that usually
 * will not change over the time for a given offer nor the user:
 * - location
 * - ab test
 * - real estate
 * - history checks
 * ...
 */
import OfferJob from './job';
import { getABNumber, orPromises } from '../../utils';
import logger from '../../common/offers_v2_logger';


// /////////////////////////////////////////////////////////////////////////////
//

/**
 * check if a number is in a range [A, B]
 */
const isInRange = (x, A, B) => (x >= A && x <= B);


// /////////////////////////////////////////////////////////////////////////////
//                    DEFINE ALL THE FILTERS HERE
// /////////////////////////////////////////////////////////////////////////////

/**
 * This method will perform a history check and will return the proper value
 * depending on the conditions and what we get from the history matching
 * @param historyMatcher  Module to perform the history check.
 * @param historyCheck    The data containing the check to be performed and the rules
 * @return true if we should filter the offer, false otherwise
 */
const performHistoryCheck = (historyMatcher, historyCheck) => {
  const query = {
    since_secs: historyCheck.since_secs,
    till_secs: historyCheck.till_secs
  };
  return historyMatcher.countMatches(
    query,
    historyCheck.patterns,
    historyCheck.patternIndex
  ).then((result) => {
    if (result < 0) {
      // remove it
      logger.error('Something went wrong trying to get the history result for', historyCheck);
      return Promise.resolve(true);
    }

    const matchesMinExpected = result >= historyCheck.min_matches_expected;
    const shouldRemoveOffer = historyCheck.remove_if_matches ?
      matchesMinExpected :
      !matchesMinExpected;
    return Promise.resolve(shouldRemoveOffer);
  });
};

/**
 * This method will perform all the filters for a given offer and will return
 * true or false if the offer should be removed or not (true == filtered out, false otherwise).
 * The promise will be evaluated once we get the final result on all the filters
 */
const shouldFilterOffer =
  (
    offer,
    { presentRealEstates, geoChecker, historyMatcher, categoryHandler }
  ) => {
    // check the offer is valid and contains all the data we need
    const filterByValidity = () => Promise.resolve(!offer || !offer.isValid());

    // if an AB test offer, we filter out the ones that cannot be shown for this
    // user
    const filterByABTest = () =>
      Promise.resolve(
        offer.ABTestInfo &&
        !isInRange(getABNumber(), offer.ABTestInfo.start, offer.ABTestInfo.end)
      );

    // check if the targeted real estate is present on the client
    const filterByRealEstates = () =>
      Promise.resolve(
        !offer.destinationRealEstates ||
        !offer.destinationRealEstates.some(re => presentRealEstates.has(re))
      );

    // check if they are geo targeted, we filter them by location
    const filterByGeo = () =>
      Promise.resolve(
        offer.isGeoLocated() &&
        (!geoChecker ||
        !geoChecker.matches(offer.geoInfo))
      );

    // check at least one category is active, if not filter
    const filterByCategories = () =>
      Promise.resolve(
        offer.hasCategories() &&
        !offer.categories.some(cat => categoryHandler.isCategoryActive(cat))
      );

    // we will check the history if needed
    const filterByHistory = () => {
      if (!offer.hasHistoryChecks()) {
        return Promise.resolve(false);
      }
      // if offer has history checks and we do not have history feature => we
      // automatically discard this offer since we cannot know about it
      if (!historyMatcher || !historyMatcher.hasHistoryEnabled()) {
        return Promise.resolve(true);
      }

      // we check history and see if we can return right now or we need to still
      // wait for the results => PENDING
      const historyCheckList = offer.historyChecks;
      const historyResultsPromises = [];
      for (let i = 0; i < historyCheckList.length; i += 1) {
        historyResultsPromises.push(performHistoryCheck(historyMatcher, historyCheckList[i]));
      }
      return Promise.all(historyResultsPromises).then(results => results.some(x => x));
    };

    // all the filters here
    const allFiltersFunctions = [
      filterByValidity,
      filterByABTest,
      filterByRealEstates,
      filterByGeo,
      filterByCategories,
      filterByHistory,
    ];

    if (logger.LOG_LEVEL === 'debug') {
      const logFilterFunction = (fun, name) =>
        () => fun().then((result) => {
          if (result) {
            logger.debug(`Offer ${offer.uniqueID} filtered with filter: ${name}`);
          }
          return Promise.resolve(result);
        });

      for (let i = 0; i < allFiltersFunctions.length; i += 1) {
        allFiltersFunctions[i] = logFilterFunction(allFiltersFunctions[i],
          allFiltersFunctions[i].name);
      }
    }

    return orPromises(allFiltersFunctions);
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
   *   // pattern matching for history checks.
   *   historyMatcher: {},
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
        } else {
          // TODO: remove this debug once it is all stable
          logger.debug(`Offer ${offerList[i].uniqueID} hard-filtered out!`);
        }
      }
      return Promise.resolve(resultOffersList);
    });
  }
}
