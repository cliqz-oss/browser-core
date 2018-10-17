import OfferJob from './job';


/**
 * We will remove all the duplicated offers
 */
const uniqueOffers = (offerList) => {
  const onListOffers = new Set();
  const result = [];
  offerList.forEach((o) => {
    if (!onListOffers.has(o.uniqueID)) {
      onListOffers.add(o.uniqueID);
      result.push(o);
    }
  });
  return result;
};


/**
 * This job will gather all the offers from the intent system
 */
export default class IntentGatherer extends OfferJob {
  constructor() {
    super('IntentGatherer');
  }

  process(offerList, { intentHandler, intentOffersHandler }) {
    const activeIntents = intentHandler.getActiveIntents();
    let allOffers = [];
    activeIntents.forEach((intent) => {
      allOffers = allOffers.concat(intentOffersHandler.getOffersForIntent(intent.getName()));
    });

    // remove duplicates
    allOffers = uniqueOffers(allOffers);
    return Promise.resolve(allOffers);
  }
}
