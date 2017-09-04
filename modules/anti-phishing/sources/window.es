import utils from 'core/utils';
import events from 'core/events';
import CliqzAntiPhishing from 'anti-phishing/anti-phishing';

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
  }

  unload() {
  }

  status() {
    const currentURL = this.window.gBrowser.currentURI.spec;
    const [md5Prefix, md5Surfix] = CliqzAntiPhishing.getSplitMd5(currentURL);
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
