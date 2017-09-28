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

    // gBrowser.addTab silently fails if it is called too
    // close to browser window initialization
    setTimeout((win) => {
      const oldTab = win.gBrowser.selectedTab;
      utils.openLink(win, utils.CLIQZ_ONBOARDING_URL, true);
      win.gBrowser.removeTab(oldTab);
    }, 100, this.window);
  }

  unload() {

  }
}
