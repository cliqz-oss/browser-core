import getTestUrl from '../platform/integration-tests/test-launcher';
import { getActiveTab } from '../platform/browser';
import { newTab } from '../platform/tabs';

import BaseWindow from '../core/base/window';
import prefs from '../core/prefs';
import sleep from '../core/helpers/sleep';

import initializeHelpers from './initialize-test-helpers';

const TESTS_STATE_PREF = 'integration-tests.started';

export default class IntegrationTestsWindow extends BaseWindow {
  async init() {
    if (!this.testsStarted) {
      initializeHelpers(this.window);
      this.startTestsWhenExtensionLoaded();
    }
  }

  unload() {
    this.testsStarted = false;
  }

  get testsStarted() {
    return prefs.get(TESTS_STATE_PREF, false);
  }

  set testsStarted(value) {
    return prefs.set(TESTS_STATE_PREF, value);
  }

  async startTestsWhenExtensionLoaded() {
    if (this.window.CLIQZ.app.isFullyLoaded) {
      await this.startTests();
    } else {
      await sleep(1000);
      await this.startTestsWhenExtensionLoaded();
    }
  }

  async startTests() {
    // Optionally get options from data url opened from the launcher. This is
    // useful when the browser is launched by Selenium (in the case of Chromium
    // tests), since we cannot set prefs directly.
    const { url } = await getActiveTab();
    const prefix = 'data:text/plain,';
    if (url.startsWith(prefix)) {
      const { grep, forceExtensionReload } = JSON.parse(url.substr(prefix.length));
      if (grep !== undefined) {
        prefs.set('integration-tests.grep', grep);
      }
      if (forceExtensionReload !== undefined) {
        prefs.set('integration-tests.forceExtensionReload', forceExtensionReload);
      }
    }

    // Get options for tests from prefs
    const forceExtensionReload = prefs.get('integration-tests.forceExtensionReload', 0);
    const grep = prefs.get('integration-tests.grep', '');

    // Create test URL
    const testsUrl = getTestUrl('integration-tests/index.html', {
      forceExtensionReload,
      grep
    });

    // Start tests
    this.testsStarted = true;
    await newTab(testsUrl).catch((ex) => {
      // eslint-disable-next-line no-console
      console.error('Could not open new tab', ex);
    });
  }
}
