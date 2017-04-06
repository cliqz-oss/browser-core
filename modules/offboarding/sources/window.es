import inject from '../core/kord/inject';
import utils from '../core/utils';

export default class {
  constructor({ window, settings }) {
    this.settings = settings;
    this.window = window;
    this.core = inject.module('core');
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
