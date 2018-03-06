import utils from '../core/utils';
import CliqzAntiPhishing from './anti-phishing';

export default class Win {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
  }

  unload() {
  }

  status() {
    const currentURL = this.window.gBrowser.currentURI.spec;
    const isWhitelisted = CliqzAntiPhishing.isInWhitelist(currentURL);
    const whitelistStatus = CliqzAntiPhishing.getUrlWhitelistStatus(currentURL);
    const active = utils.getPref('cliqz-anti-phishing-enabled', true);
    let state = 'active';
    if (isWhitelisted && whitelistStatus !== CliqzAntiPhishing.WHITELISTED_TEMPORARY) {
      state = 'inactive';
    }
    if (!active) {
      state = 'critical';
    }
    return {
      visible: true,
      active,
      isWhitelisted,
      state
    };
  }
}
