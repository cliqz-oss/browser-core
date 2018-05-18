import inject from '../core/kord/inject';
import prefs from '../core/prefs';
import BaseWindow from '../core/base/window';
import initializeHelpers from './initialize-test-helpers';
import sleep from '../core/helpers/sleep';

export default class FirefoxTestsWindow extends BaseWindow {
  deps = {
    core: inject.module('core'),
    ui: inject.module('ui'),
  };

  async init() {
    await this.deps.ui.isWindowReady(this.window);

    await sleep(10000);

    initializeHelpers(this.window);
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
