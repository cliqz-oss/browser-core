import utils from '../core/utils';


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
export default class {
  init() {}

  unload() {}

  status() {
    return {
      showSettings: utils.getPref('offers2ShowSettings', false) === true,
      userEnabled: utils.getPref('offers2UserEnabled', true) === true,
      locationEnabled: utils.getPref('offers_location', 1) === 1  // 0 = off, 1 = IP based
    };
  }
}
