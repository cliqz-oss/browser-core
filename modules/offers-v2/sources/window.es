import utils from '../core/utils';


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
export default class {
  constructor(settings) {
    // check if we have the feature  enabled
    if (!utils.getPref('offers2FeatureEnabled', false)) {
      return;
    }
  }

  init() {
    // check if we have the feature  enabled
    if (!utils.getPref('offers2FeatureEnabled', false)) {
      return;
    }
  }

  unload() {
  }
}
