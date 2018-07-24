import inject from '../core/kord/inject';
import prefs from '../core/prefs';
import BaseWindow from '../core/base/window';
import initializeHelpers from './initialize-test-helpers';
import sleep from '../core/helpers/sleep';

export default class FirefoxTestsWindow extends BaseWindow {
  deps = {
    core: inject.module('core'),
  };


  init() {
    const testsStarted = prefs.get('firefox-tests.started', false);
    initializeHelpers(this.window);
    if (!testsStarted) {
      this.checkIfLoaded();
    }
  }

  unload() {}

  async checkIfLoaded() {
    if (this.window.CLIQZ.app.isFullyLoaded) {
      this.startTests();
      return;
    }

    await sleep(1000);

    this.checkIfLoaded();
  }

  startTests() {
    const forceExtensionReload = prefs.get('firefox-tests.forceExtensionReload', 0);
    const closeOnFinish = prefs.get('firefox-tests.closeOnFinish', 0);
    const grep = prefs.get('firefox-tests.grep', '');
    const url = `chrome://cliqz/content/firefox-tests/index.html?closeOnFinish=${closeOnFinish}&forceExtensionReload=${forceExtensionReload}&grep=${grep}`;

    prefs.set('firefox-tests.started', true);
    if (closeOnFinish) {
      this.deps.core.action('openLink', url);
    }
  }
}
