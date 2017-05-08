import inject from '../core/kord/inject';
import utils from '../core/utils';
import { forEachWindow } from '../platform/browser';


export default class {
  constructor({ window, settings }) {
    this.settings = settings;
    this.window = window;
    this.core = inject.module('core');

    // in case the extension runs in the CLIQZ browser we could get fake uninstall
    // signals from the system addon updater so we must remove any offboarding page
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=1351617
    if (settings.channel === '40') {
      const offboardingURL = [
        'https://cliqz.com/home/offboarding', // == utils.UNINSTALL
        'https://cliqz.com/offboarding',
        'https://cliqz.com/en/offboarding',
        'https://cliqz.com/fr/offboarding'
      ];
      forEachWindow((win) => {
        win.gBrowser.tabs.forEach((tab) => {
          if (offboardingURL.indexOf(tab.linkedBrowser.currentURI.spec) !== -1) {
            win.gBrowser.removeTab(tab);
          }
        });
      });
    }
  }
  init() {}
  unload() {}
  disable() {
    const version = this.settings.version;
    const window = this.window;
    if (window === utils.getWindow()) {
      this.core.action('setSupportInfo', 'disabled');
      try {
        const UNINSTALL_PREF = 'uninstallVersion';
        const lastUninstallVersion = utils.getPref(UNINSTALL_PREF, '');

        if (version && (lastUninstallVersion !== version)) {
          utils.setPref(UNINSTALL_PREF, version);
          utils.openLink(
            window,
            utils.UNINSTALL,
            true,  // newTab
            false, // newWindow
            false, // newPrivateWindow
            true);   // focus
        }
      } catch (e) {
        // Nothing
      }
    }
  }
}
