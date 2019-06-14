import { getGeneralDomain } from '../../core/tlds';
import logger from '../common/offers_v2_logger';
import { rewriteUrlForOfferMatching } from '../utils';
import annotateWithShopId from './features/shop-id';
import annotateAsClickShop from './features/click-shop';

const MAX_JOURNEY_SIZE = 48;

//
// Annotate the step. Drop an `unk` placeholder
//
export function putFeatureToStep(step, feature) {
  const features = step.features;
  features.push(feature);
  if (features[0] === 'unk') {
    features.shift();
  }
}

/**
 * Store recent user behavior and convert it to a journey.
 *
 * A new step is created each time a new page is loaded. Then feature
 * extractors annotate the step using `addFeature`.
 *
 * @class JourneyCollector
 */
export default class JourneyCollector {
  constructor() {
    /*
     * Journey is a list of steps, a step is:
     * {string[]} features: a set of features
     * {string}   url
     * {string}   domain
     * {string}   referrer (optional)
     */
    this.journey = [];
  }

  /**
   * @method getJourney
   * @returns {string[][]}
   */
  getJourney() {
    return this.journey.map(step => [...step.features]);
  }

  /**
   * Create a new step and remember its url
   *
   * @method addStep
   * @param {string} feature
   * @param {string} url
   */
  addStep({ feature, url }) {
    const step = {
      features: [feature],
      url,
      domain: getGeneralDomain(url)
    };
    this.journey.push(step);
    //
    // Limit size of journey
    //
    if (this.journey.length > MAX_JOURNEY_SIZE) {
      this.journey.shift();
    }
  }

  /**
   * @method addFeature
   * @param {string} feature
   * @param {string} url  where from the feature is extracted
   * @param {string} referrer  optional
   */
  addFeature({ feature, url: urlIn, referrer }) {
    const url = urlIn && rewriteUrlForOfferMatching(urlIn);
    //
    // Get the last step
    //
    if (!this.journey.length) {
      logger.log(`journey:addFeature: no steps to add feature ${feature}:${url}`);
      return;
    }
    //
    // Merge the feature into the last step, or drop the feature
    // if it belongs to some other step.
    //
    const step = this.journey[this.journey.length - 1];
    if (url && (step.url !== url)) {
      logger.log(`journey:addFeature: url mismatch feature ${feature}:${url} to step ${step.url}`);
      return;
    }
    putFeatureToStep(step, feature);
    //
    // In the ideal world, the referrer would be set in `addStep`.
    // But in the reality the caller of `addStep` doesn't have the
    // referrer. Instead, the referrer is sent by the shop detection
    // content script.
    //
    if (referrer) {
      step.referrer = referrer;
    }
    //
    // Derive features
    //
    if (feature === 'shop') {
      annotateWithShopId(this.journey);
      annotateAsClickShop(this.journey);
    }
  }
}
