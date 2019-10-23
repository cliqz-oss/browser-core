/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Implement a mechanism which allows to inject the state of CLIQZ's background
 * in pages (content script) very fast. It enables code running in content
 * scripts to know about the state of background modules as soon as they are
 * injected (which is needed to decide if they should run in the first place).
 *
 * It works by injecting a second, very small content-script in all pages as
 * soon as possible (for Firefox this is using the
 * `browser.contentScripts.register` function for dynamic content script
 * injection, and on Chrome we rely on `tabs.executeScript` to achieve a similar
 * result).
 *
 * This small additional content script (check `generateContentScript` to see
 * how it looks like) injects the CLIQZ global (directly on the `window`
 * object), which contains the state of the Cliqz App (are modules enabled,
 * etc.).
 *
 * There is a bit of complexity here since we don't know which of the two
 * content scripts will be injected first in any page; and this might not always
 * be the same order. In some cases the main content script (defined in
 * manifest.json) might be injected first, in other cases the additional one
 * defined in this file might be faster. This means that both content scripts
 * implement some logic to detect the actual order and behave accordingly.
 *
 * 1. If the main content script is injected first, it will check if the CLIQZ
 * global already exists on the `window` object. If it does, it is used and
 * injection of modules' content script is performed. Otherwise, it sends a
 * message to the background to get the state of the app (the result will be
 * ignored if the second content script was injected in the meanwhile)
 *
 * 2. The secondary content-script will check if the `runCliqz` global exists on
 * `window` object. It is set by the main content script in case it runs first,
 * and can be used to start the injection of modules' content script.
 *
 * In either case, we make sure that content scripts from modules are injected
 * as soon as possible.
 *
 * This mechanism typically saves a round-trip to the background (to ask the
 * state of the App); which takes 150-200ms at best. This is critical for some
 * modules like the adblocker or anti-tracking, which need to perform actions
 * very fast.
 *
 * To know more about differences in implementations for Firefox or Chrome,
 * check the documentation of `FirefoxInjection` and `ChromeInjection`.
 */

import { browser, chrome, isContentScriptsSupported } from './globals';
import { setTimeout } from './timers';

/**
 * Return a self-executing function (as a string) which will inject `CLIQZ`
 * global with `cliqz` as a value (or trigger injection of content scripts if
 * `runCliqz` global is already defined). It is used to update the status of
 * CLIQZ' background modules as seen by content scripts. This information is
 * required to perform injection of modules' content script because we need to
 * know if their background is enabled or not.
 */
function generateContentScript(cliqz) {
  return `(function () {
  window.CLIQZ = ${JSON.stringify(cliqz)};
  if (window.runCliqz !== undefined) {
    window.runCliqz(window.CLIQZ);
    window.runCliqz = undefined;
  }
}());`;
}

/**
 * Get status of App from API and return a CLIQZ-like object to be injected in
 * content scripts (as `window.CLIQZ`). The object should have a similar shape
 * to the CLIQZ global used in background pages (you know, the one you use in
 * the browser console to debug the extension).
 */
function createCliqzObject(app) {
  return {
    app: app.status(),
  };
}


/**
 * Implement injection of the additional content script for Firefox platform
 * using the `browser.contentScripts.register(...)` API. The function
 * dynamically created by `generateContentScript(...)` is used as dynamic
 * content script and injected in all pages (top-level or iframes).
 */
class FirefoxInjection {
  constructor() {
    this.scriptRegistration = null;
  }

  init() { return Promise.resolve(); }

  unload() {
    // unregister previous script
    if (this.scriptRegistration !== null) {
      this.scriptRegistration.unregister();
      this.scriptRegistration = null;
    }
  }

  async setCliqzGlobal(cliqz) {
    this.unload(); // unregister existing content script if any
    this.scriptRegistration = await browser.contentScripts.register({
      allFrames: true,
      matchAboutBlank: true,
      js: [{
        code: generateContentScript(cliqz),
      }],
      runAt: 'document_start',
      matches: [
        'http://*/*',
        'https://*/*',
      ],
    });
  }
}

/**
 * Implement injection of the additional content script for Chromium-based
 * browsers. A different mechanism is needed because Chrome does not offer the
 * `browser.contentScripts.register(...)` API. To achieve a similar result, we
 * use `tabs.executeScript(...)`. This needs to be done for all frames. To
 * detect all of them, we use the `webRequest.onCompleted` event constrained to
 * 'main_frame' and 'sub_frame' events.
 */
class ChromeInjection {
  constructor() {
    this.code = '';

    // This listener is triggered for every new `main_frame` and `sub_frame`
    // event observed by the `webRequest.onCompleted` API. This allows us to
    // inject a dynamic content script as soon as possible and set the CLIQZ
    // global (which contains information about App and modules statuses).
    this._frameListener = ({ tabId, frameId }) => {
      // Attempt to call `tabs.executeScript(...)` on the new frame. This will
      // fail until the frame exists, so retry until it succeeds. Abort after 10
      // attempts.
      let attemptCounter = 10;
      (function injectFrameScript(code) {
        // Check if we should abort
        if (attemptCounter === 0) {
          return;
        }
        attemptCounter -= 1;

        // Try to inject and schedule a new attempt if it fails
        chrome.tabs.executeScript(tabId, {
          code,
          frameId,
          runAt: 'document_start',
        }, () => {
          if (chrome.runtime.lastError) {
            setTimeout(() => injectFrameScript(code), 2);
          }
        });
      }(this.code));
    };
  }

  init() {
    browser.webRequest.onCompleted.addListener(this._frameListener, {
      urls: ['http://*/*', 'https://*/*'],
      types: ['main_frame', 'sub_frame'],
    });
  }

  unload() {
    browser.webRequest.onCompleted.removeListener(this._frameListener);
  }

  setCliqzGlobal(cliqz) {
    this.code = generateContentScript(cliqz);
  }
}

export default class FastContentAppStateInjecter {
  constructor() {
    this.scriptInjector = (
      isContentScriptsSupported()
        ? new FirefoxInjection()
        : new ChromeInjection()
    );
  }

  init(app) {
    this.scriptInjector.init();
    this.shareAppState(app);
  }

  unload() {
    this.scriptInjector.unload();
  }

  shareAppState(app) {
    app.ready().then(() => {
      this.scriptInjector.setCliqzGlobal(createCliqzObject(app));
    });
  }
}
