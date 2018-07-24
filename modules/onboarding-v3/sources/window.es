import utils from '../core/utils';
import config from '../core/config';
import { shouldShowOnboarding } from '../core/onboarding';

export default class Win {
  constructor(settings) {
    this.window = settings.window;

    if (this.window.gInitialPages
      && this.window.gInitialPages.indexOf(config.settings.ONBOARDING_URL) === -1) {
      this.window.gInitialPages.push(config.settings.ONBOARDING_URL);
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
      if (oldTab.linkedBrowser.currentURI.spec === 'about:welcomeback') {
        return;
      }

      utils.openLink(win, config.settings.ONBOARDING_URL, true);
      win.gBrowser.removeTab(oldTab);

      // stop button remains active in Firefox 56
      // TODO: remove this after EX-5858 is resolved
      const reloadButton = win.document.getElementById('reload-button');
      if (reloadButton) {
        reloadButton.removeAttribute('displaystop');
      }
    }, 100, this.window);
  }

  unload() {

  }
}
