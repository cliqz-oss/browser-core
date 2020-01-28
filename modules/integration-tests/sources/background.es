/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import loggerManager from '../core/logger';
import config from '../core/config';
import prefs from '../core/prefs';
import sleep from '../core/helpers/sleep';
import getTestUrl from '../platform/integration-tests/test-launcher';
import {
  getActiveTab,
  addWindowObserver,
  removeWindowObserver,
  forEachWindow,
} from '../platform/browser';
import { browser } from '../platform/globals';
import { newTab } from '../platform/tabs';

import initializeHelpers from './initialize-test-helpers';

function stringify(obj) {
  return (typeof obj === 'string') ? obj : JSON.stringify(obj);
}

export default {
  requiresServices: [
    'test-helpers'
  ],

  init() {
    // Send logger messages to TAP, which will forward them to `fern.js`
    if (config.EXTENSION_LOG) {
      this.logChannel = new BroadcastChannel('extlog');
      loggerManager.addObserver((level, ...args) => {
        const stringArgs = args.map(stringify);
        const msg = stringArgs.join(',,, ');
        this.logChannel.postMessage({ level, msg });
      });
    }

    prefs.set('integration-tests.started', true);
    this.window = chrome.extension.getBackgroundPage().window;
    initializeHelpers(this.window);

    // Mix messages from content scripts into the extension output
    this.mixextlogListener = (ev) => {
      if (ev.type === 'mixextlog') {
        const { level, msg } = ev;
        const prn = this.window.console[level] || this.window.console.log;
        if (Array.isArray(msg)) { prn(...msg); } else { prn(msg); }
        if (this.logChannel) {
          this.logChannel.postMessage({ level, msg });
        }
      }
    };
    browser.runtime.onMessage.addListener(this.mixextlogListener);

    forEachWindow(() => this.startTestsWhenExtensionLoaded());
    this.windowObserver = (w, topic) => {
      if (topic === 'opened') {
        this.startTestsWhenExtensionLoaded();
      }
    };
    addWindowObserver(this.windowObserver);
  },

  unload() {
    browser.runtime.onMessage.removeListener(this.mixextlogListener);
    if (this.logChannel) {
      this.logChannel.close();
    }
    removeWindowObserver(this.windowObserver);
  },

  async startTestsWhenExtensionLoaded() {
    if (this.window.CLIQZ.app.isFullyLoaded) {
      await this.startTests();
    } else {
      await sleep(1000);
      await this.startTestsWhenExtensionLoaded();
    }
  },

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
};
