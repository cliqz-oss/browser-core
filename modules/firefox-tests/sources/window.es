import inject from '../core/kord/inject';
import prefs from '../core/prefs';

export default class FirefoxTestsWindow {
  deps = {
    core: inject.module('core'),
  };

  init() {
    const forceExtensionReload = prefs.get('firefox-tests.forceExtensionReload', 0);
    const closeOnFinish = prefs.get('firefox-tests.closeOnFinish', 0);
    const grep = prefs.get('firefox-tests.grep', '');
    const url = `chrome://cliqz/content/firefox-tests/index.html?closeOnFinish=${closeOnFinish}&forceExtensionReload=${forceExtensionReload}&grep=${grep}`;
    if (closeOnFinish) {
      this.deps.core.action('openLink', url);
    }
  }

  unload() {}
}
