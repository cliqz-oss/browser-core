import logger from '../common/offers_v2_logger';
import getFeatures from './feature-builder';


export default class FeatureHandler {
  constructor() {
    this.features = new Map();
    const features = getFeatures();
    features.forEach((feature) => {
      // init the feature and check
      if (!feature.init()) {
        logger.error(`Problem initializing the feature ${feature.getName()}`);
      } else {
        logger.info(`Feature ${feature.getName()} initialized properly`);
        this.features.set(feature.getName(), feature);
      }
    });
  }

  unload() {
    this.features.forEach((feature, fname) => {
      if (!feature.unload()) {
        logger.error(`Error uninitializing the feature ${fname}`);
      } else {
        logger.info(`Feature ${fname} uninitialized properly`);
      }
    });
    this.features.clear();
  }

  isFeatureAvailable(featureName) {
    if (!this.features.has(featureName)) {
      return false;
    }
    return this.features.get(featureName).isAvailable();
  }

  getFeature(featureName) {
    return this.features.get(featureName);
  }

  dumpFeaturesData() {
    logger.info('Features data: ', this.features);
  }
}
