import getTestUrl from '../platform/integration-tests/test-launcher';
import { getActiveTab } from '../platform/browser';
import { newTab } from '../platform/tabs';

import prefs from '../core/prefs';
import BaseWindow from '../core/base/window';
import sleep from '../core/helpers/sleep';

import initializeHelpers from './initialize-test-helpers';

export default class IntegrationTestsWindow extends BaseWindow {
  init() {
    prefs.set('integration-tests.started', true);
    initializeHelpers(chrome.extension.getBackgroundPage().window);
    this.startTestsWhenExtensionLoaded();
  }

  unload() {
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
    // useful when the browser is launched by puppeteer (in the case of Chromium
    // tests), since we cannot set prefs directly.
    const { url } = await getActiveTab();
    const prefix = 'data:text/plain,';
    let grep = '';
    let forceExtensionReload = false;
    let autostart = false;
    if (url.startsWith(prefix)) {
      const options = JSON.parse(url.substr(prefix.length));
      grep = options.grep;
      forceExtensionReload = options.forceExtensionReload;
      autostart = options.autostart;
    }

    // Create test URL
    const testsUrl = getTestUrl('integration-tests/index.html', {
      forceExtensionReload,
      grep,
      autostart,
    });

    // Start tests
    await newTab(testsUrl).catch((ex) => {
      // eslint-disable-next-line no-console
      console.error('Could not open new tab', ex);
    });
  }
}
