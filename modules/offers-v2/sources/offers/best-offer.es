/**
 * @class BestOffer
 */

/**
 * Scale the offer's reward by similarity between the categories of
 * the offer and of the environment.
 *
 * @method getWeichtedReward
 * @private
 * @param {Offer} offer
 * @param envCategoryWeighter
 * @return number
 */
function getWeightedReward(offer, envCategoryWeighter) {
  const cats = offer.categories;
  if (!(cats && cats.length)) {
    // Offers of the week do not have categories
    // Give them a chance anyway
    return 1;
  }
  // Example: the weights vector could be:
  // [0; 5; 7; 0; 0; 0]
  const envCatWeights = Array.from(
    envCategoryWeighter.weightsIter(cats),
    item => item[1]
  );
  // Example: the weights vector could be
  // [0; 0.33; 0.33; 0.33; 0; 0]
  // In general case, we should do scalar multiplication of the two
  // vectors. But we know that the offer's vector has N entries with
  // the value 1/N and can optimize calculations.
  const sum = envCatWeights.reduce((a, b) => a + b, 0);
  const likeCosineSimilarity = sum / cats.length;
  return offer.getReward() * likeCosineSimilarity;
}

/**
 * See description of `chooseBestOffer`
 *
 * @method chooseBestOfferByRewardPerDisplay
 * @private
 */
function chooseBestOfferByRewardPerDisplay(
  offers,
  envCategoryWeighter,
  displayCountFunc
) {
  return offers.reduce(
    ([bestOffer, bestScore, bestReward], offer) => {
      const reward = getWeightedReward(offer, envCategoryWeighter);
      const count = displayCountFunc(offer);
      const score = reward / (count || 1);

      const isBetterOffer = (score > bestScore)
        || ((score === bestScore) && (reward > bestReward));
      return isBetterOffer
        ? [offer, score, reward]
        : [bestOffer, bestScore, bestReward];
    },
    [null, 0, -10000]
  );
}

/**
 * Select offers proportionally to their rewards and reverse proportionally
 * to their display counts, In other words, if an offer1 is twice better
 * than offer2, then show offer1 twice more often than offer2.
 *
 * The caller should check the returned values:
 * - the offer is not `null` and
 * - the score is not zero.
 *
 * @method chooseBestOffer
 * @param {Offer[]} offers
 * @param {CategoriesMatchTraits} envCategoryWeighter
 * @param {Offer => number} displayCountFunc
 *   Return display count for the offer
 * @returns {[Offer, number, number]}
 * - Return `null` offer if the input list is empty
 * - The second number is the best score. If the value is zero, it means
 *   that the offers do not fit matched categories. Use the score value
 *   only as a binary flag valid/invalid.
 * - Ignore the third number. It might be removed in future API revisions.
 */
export default function chooseBestOffer(offers, envCategoryWeighter, displayCountFunc) {
  if (!offers.length) {
    return [null, 0, 0];
  }
  return chooseBestOfferByRewardPerDisplay(offers, envCategoryWeighter, displayCountFunc);
}
