import logger from '../../common/offers_v2_logger';
import { putFeatureToStep } from '../collector';

function getShopIdFromStep(step) {
  for (const feature of step.features) {
    if (feature.startsWith('shop-')) {
      return feature;
    }
  }
  logger.warn('annotateWithShopId: shop-step doesn\'t contain an ID');
  return 'shop-X';
}

/**
 * @method annotateWithShopId
 * @param {typeof(JourneyCollector.journey)} journey
 *
 * Prerequisites:
 * - there is at least one step in `journey`, and
 * - the last step is of type `shop`.
 *
 */
export default function annotateWithShopId(journey) {
  const lastStep = journey[journey.length - 1];
  if (!lastStep.domain) {
    return;
  }
  //
  // Find the shop in the history
  // Walk over visits, most recent first
  //
  const allFeatures = new Set();
  for (let i = journey.length - 2; i >= 0; i -= 1) {
    const pastStep = journey[i];
    if (pastStep.features.includes('shop')) {
      if (pastStep.domain === lastStep.domain) {
        //
        // The shop is found, Annotate with its ID and exit.
        //
        const shopId = getShopIdFromStep(pastStep);
        putFeatureToStep(lastStep, shopId);
        return;
      }
      pastStep.features.forEach(allFeatures.add, allFeatures);
    }
  }
  //
  // The shop was not found. Calculate a new ID.
  //
  for (let i = 1; i < allFeatures.size + 4; i += 1) { // +4 is a trick to avoid off-by-one errors
    const shopId = `shop-${i}`;
    if (!allFeatures.has(shopId)) {
      putFeatureToStep(lastStep, shopId);
      break;
    }
  }
}
