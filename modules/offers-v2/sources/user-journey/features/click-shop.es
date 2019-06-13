import { putFeatureToStep } from '../collector';

/**
 * @method classifyAsClickShop
 * @param {typeof(JourneyCollector.journey)} journey
 *
 * Prerequisites:
 * - there is at least one step in `journey`, and
 * - the last step is of type `shop`.
 *
 * The code finds steps that refers to the shop and annotate them
 * as `click-shop`.
 */
export default function classifyAsClickShop(journey) {
  const lastStep = journey[journey.length - 1];
  const referrer = lastStep.referrer;
  if (!referrer) {
    return;
  }
  const shopDomain = lastStep.domain;
  journey.forEach((pastStep) => {
    if ((pastStep.url === referrer) && (pastStep.domain !== shopDomain)) {
      putFeatureToStep(pastStep, 'click-shop');
    }
  });
}
