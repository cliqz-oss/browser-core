import inject from '../core/kord/inject';
import utils from '../core/utils';
import prefs from '../core/prefs';
import config from '../core/config';

export default class Win {
  constructor({ window, settings }) {
    this.settings = settings;
    this.window = window;
    this.coreCliqz = inject.module('core-cliqz');
  }

  init() {}

  unload() {}

  disable() {
    const version = this.settings.version;
    const window = this.window;
    if (window === utils.getWindow()) {
      this.coreCliqz.action('setSupportInfo', 'disabled');
      try {
        const UNINSTALL_PREF = 'uninstallVersion';
        const lastUninstallVersion = prefs.get(UNINSTALL_PREF, '');

        if (version && (lastUninstallVersion !== version)) {
          prefs.set(UNINSTALL_PREF, version);
          utils.openLink(
            window,
            config.settings.UNINSTALL,
            true, // newTab
            false, // newWindow
            false, // newPrivateWindow
            true // focus
          );
        }
      } catch (e) {
        // Nothing
      }
    }
  }
}
