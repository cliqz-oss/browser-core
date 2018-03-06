import { injectNonOrganicOffers, injectSmartCliqzOffer } from '../operators/results/inject-offers';

const injectOffers = (results$, offers$, config) =>
  results$
    .combineLatest(offers$)
    .map(([resultResponse, offerResponse]) => {
      const results = resultResponse.results;
      const offers = offerResponse.results;
      let merged;
      const { isInjected, results: resultsWithSmartCliqzOffers } =
        injectSmartCliqzOffer(results, offers[0], config);
      if (!isInjected) {
        merged = injectNonOrganicOffers(results, offers, config);
      } else {
        merged = resultsWithSmartCliqzOffers;
      }

      return {
        ...resultResponse,
        results: merged,
      };
    });

export default injectOffers;
