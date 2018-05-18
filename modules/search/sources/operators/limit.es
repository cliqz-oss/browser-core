import { getMainLink } from '../operators/normalize';

const isLastResultOffer = (results) => {
  if (results.length === 0) {
    return false;
  }
  const lastResult = getMainLink(results[results.length - 1]);
  return lastResult.template === 'offer';
};

const appendOfferResult = (results, limit) => {
  let finalResults = results;
  const lastResult = results[results.length - 1];
  finalResults = results.slice(0, limit - 1);
  finalResults.push(lastResult);
  return finalResults;
};

// TODO: limit (sub)links
/*
 * Limits number of results. The limit depends on the provider.
 *
 * @param {Object} response - The response.
 */
const limit = ({ results, ...response }) => {
  const aLimit = response.config.operators.limit.limits[response.provider];
  let finalResults = results.slice(0, aLimit);
  const offerPosition = response.config.operators.offers.position;
  if (response.provider === 'cliqz'
    && offerPosition === 'last'
    && isLastResultOffer(results)) {
    finalResults = appendOfferResult(results, aLimit);
  }
  return {
    ...response,
    results: finalResults,
  };
};

export default limit;
