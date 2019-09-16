/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { chrome, window } from '../../platform/content/globals';
import runtime from '../../platform/runtime';

import ContentScriptActionsManager from './actions-manager';
import { runContentScripts } from './register';

/**
 * Request App status from core background. This is the slowest way to get App
 * status but is used as a fallback. In most cases, the status will be received
 * before from the dynamic content script injected by `fast-content-app-state-injection.es`
 */
function getAppStatusFromBackground() {
  return runtime.sendMessage({
    module: 'core',
    action: 'status',
  }).then(app => ({ app }));
}

/**
 * Here we don't know which content script was injected first. Either this one
 * is (main one defined in manifest.json) or the dynamic one is (defined in
 * `platform/fast-content-app-state-injection.es`). The following can happen:
 *
 * 1. If `window.CLIQZ` is already defined, it means the dynamic content
 * script was already injected and we already have access to the state of
 * modules.
 * 2. Otherwise, it means that we are first, and that we don't know yet the
 * state of background modules. App status can be obtained in two ways:
 *
 *   a. request status of App to core background via `sendMessage`
 *   b. dynamic content script will be injected and provide status via `runCliqz`
 *
 * Both will race and we use the result of the first of these two, the second
 * one is simply ignored.
 *
 * Overall, this strategy should result in having content scripts being
 * injected as soon as possible.
 */
function getAppStatus() {
  return new Promise((resolve) => {
    if (window.CLIQZ !== undefined) {
      // Dynamic content-script was already injected, we can proceed
      resolve(window.CLIQZ);
    } else {
      // Define `runCliqz` globally so that dynamic content script can inject
      // App status as soon as it is injected.
      window.runCliqz = resolve;

      // Dynamic content-script was not injected yet, we request status of App
      // async. It will return the same information as dynamic content script so
      // we take whatever comes first.
      getAppStatusFromBackground().then(resolve, () => { /* silence errors */ });
    }
  });
}

/**
 * Entrypoint for content script injection. This needs to be called so that
 * content scripts registered via `registerContentScript` in each module will
 * actually run. Check `content-script.bundle.es` for more information about the
 * overall flow.
 */
export default function () {
  // Only support injecting into HTML documents
  if (window.document.documentElement.nodeName.toLowerCase() !== 'html') {
    return;
  }

  // Content script actions manager needs to start listening for messages from
  // background as soon as possible since injection of actual content scripts
  // might take a while and background could request some action before it's
  // ready. Until content scripts are injected, messages received will be
  // buffered in memory.
  const contentScriptActions = new ContentScriptActionsManager();

  // Wait for App status to be received then proceed to injection
  getAppStatus().then((CLIQZ) => {
    // Augment CLIQZ global to add action support. The API can then be used from
    // content scripts of each module to transparently call actions from
    // modules' backgrounds.
    for (const [name, module] of Object.entries(CLIQZ.app.modules)) {
      // eslint-disable-next-line no-param-reassign
      module.action = (action, ...args) => runtime.sendMessage({
        module: name,
        action,
        args,
      });
    }

    // Inject enabled content-scripts and register content-script actions so that
    // background can request actions from them.
    contentScriptActions.setActionCallbacks(runContentScripts(window, chrome, CLIQZ));

    // Stop listening for messages on window unload
    window.addEventListener('unload', () => {
      contentScriptActions.unload();
    }, { once: true });
  });
}
