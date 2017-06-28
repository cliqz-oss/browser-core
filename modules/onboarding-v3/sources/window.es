import utils from 'core/utils';
import { shouldShowOnboarding } from 'core/onboarding';

export default class {
  constructor(settings) {
    this.window = settings.window;

    if (this.window.gInitialPages
      && this.window.gInitialPages.indexOf(utils.CLIQZ_ONBOARDING_URL) === -1) {
      this.window.gInitialPages.push(utils.CLIQZ_ONBOARDING_URL);
    }
  }

  init() {
    if (!shouldShowOnboarding()) {
      return;
    }
    const oldTab = this.window.gBrowser.selectedTab;
    utils.openLink(this.window, utils.CLIQZ_ONBOARDING_URL, true);
    this.window.gBrowser.removeTab(oldTab);
  }

  unload() {

  }
}
