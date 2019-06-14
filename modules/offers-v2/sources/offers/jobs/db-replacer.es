import OfferJob from './job';
import Offer from '../offer';
import logger from '../../common/offers_v2_logger';


/**
 * Replace all offers in db if we have a new version
 */
const replaceOffersOnDB = (offerList, offersDB) => {
  const result = [];
  offerList.forEach((offer) => {
    if (offersDB.isOfferPresent(offer.uniqueID)
        && offersDB.getOfferObject(offer.uniqueID).version !== offer.version) {
      // update it and add it to be processed again
      //
      // The parameter "retainAbTestInfo=true" is inspired by EX-7894.
      //
      // Consider the situation:
      // - There is an offer, already displayed to an user
      // - A manager starts an AB test by creating a few new offers
      // - The extension receives the offers from the backend
      //
      // The decision is to retain the existing offer and drop the new
      // offers of same campaign.
      //
      // The problem is that after update of the offer, its AB-bucket
      // could change. The offer will be filtered out on the next steps
      // and will never become a top-offer, which pushed to a real
      // estate. To avoid the problem, forbid changing the bucket.
      //
      // Similar logic can be applied to "filterRules", but as this
      // property can't be changed in portal, consider that a change in
      // "filterRules" does matter and should be updated.
      //
      // [NOTE-DEP], The current substep returns the offer with wrong
      // not updated "abTestInfo". The next substep "getSameOffersFromDB"
      // replaces the bad offer with the correctly updated offer from DB.
      if (!offersDB.updateOfferObject(
        offer.uniqueID,
        offer.offerObj,
        true // retainAbTestInfo
      )) {
        // EX-7208: we do not add the offer to the resulting list here since it
        // failed to update, still log the issue
        logger.error(`Couldnt update offer on DB for offer id: ${offer.uniqueID}, discarding it`);
      } else {
        result.push(offer);
      }
    } else {
      // its a new one or is the same than the DB
      result.push(offer);
    }
  });
  return result;
};

const getSameOffersFromDB = (offerList, offersDB) => {
  const resultList = [];
  offerList.forEach((offer) => {
    if (offersDB.isOfferPresent(offer.uniqueID)
        && offersDB.getOfferObject(offer.uniqueID).version === offer.version) {
      resultList.push(new Offer(offersDB.getOfferObject(offer.uniqueID)));
    } else {
      resultList.push(offer);
    }
  });
  return resultList;
};

/**
 * will remove all the offers that had been already removed from the DB
 */
const filterOffersAlreadyRemoved = (offerList, offersDB) =>
  offerList.filter(offer => !offersDB.hasOfferRemoved(offer.uniqueID));

/**
 * Remove AB-offers.
 * See also EX-7894 and the comment inside "replaceOffersOnDB".
 */
const filterOffersOfSameCampaign = (offerList, offersDB) =>
  offerList.filter(offer => !offersDB.hasAnotherOfferOfSameCampaign(offer));

/**
 * This job will replace all the current offers we have on the DB with the same
 * id but a different revision number (this will ensure we always have the latest
 * version of the offer).
 * This will also replace the offer from the BE with the one from the DB if the
 * id and version are the same (to ensure not replacing dynamic content)
 */
export default class DBReplacer extends OfferJob {
  constructor() {
    super('DBReplacer');
  }

  process(offerList, { offersDB }) {
    return Promise.resolve(
      [filterOffersAlreadyRemoved,
        filterOffersOfSameCampaign,
        replaceOffersOnDB,
        getSameOffersFromDB // should be called after replaceOffersOnDB, see [NOTE-DEP]
      ].reduce(
        (collected, fn) => fn(collected, offersDB),
        offerList
      )
    );
  }
}
