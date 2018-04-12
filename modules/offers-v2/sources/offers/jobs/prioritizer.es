import OfferJob from './job';

/**
 * This class will take a list of offers and will prioritize them and return
 * the new list in a prioritized way.
 */
export default class Prioritizer extends OfferJob {
  constructor() {
    super('Prioritizer');
  }


  process(offerList) {
    const cmpFunction = (a, b) => a.displayPriority - b.displayPriority;
    return Promise.resolve(offerList.sort(cmpFunction));
  }
}
