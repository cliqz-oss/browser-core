import { utils } from 'core/cliqz';

export default {
  init() {
    // if Control center is enabled Q button is disabled
    this.buttonEnabled = utils.getPref('controlCenter', false) == false;
  },
  unload() {}
};
