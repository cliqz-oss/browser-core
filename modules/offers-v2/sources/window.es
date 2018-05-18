import utils from '../core/utils';


// /////////////////////////////////////////////////////////////////////////////
// /////////////////////////////////////////////////////////////////////////////
export default class Win {
  init() {}

  unload() {}

  status() {
    return {
      visible: true,
      userEnabled: utils.getPref('offers2UserEnabled', true) === true,
      locationEnabled: utils.getPref('offers_location', 1) === 1, // 0 = off, 1 = IP based
    };
  }
}
