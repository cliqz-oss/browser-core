import { utils } from 'core/cliqz';
import background from 'hpn/background';

const prefKey = 'hpn-query', // 0 - enable, 1 - disable
      BLOCK = false,
      ALLOW = true;
export default class {

  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    if (background.CliqzSecureMessage) {
      background.CliqzSecureMessage.initAtWindow(this.window);
    }
  }

  unload() {
  }

  status() {
    if (background.CliqzSecureMessage && !utils.getPref('cliqz_core_disabled', false)) {
      return {
        visible: true,
        state: utils.getPref(prefKey)
      };
    }
  }
}
