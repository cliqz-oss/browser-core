/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Implement message management (i.e.: runtime.onMessage) to allow background
 * code to call actions defined in content scripts. The time-line is this:
 *
 * 1. 'content-script.bundle.js' is injected in a new page (via manifest.json)
 * 2. `RemoteMessagesBuffer` is instantiated as soon as possible (via
 *    intantiation of `ContentScriptActionsManager` in `core/content/run.es`) and
 *    starts buffering messages received from background. This ensures that
 *    messages are not lost during the time content scripts from each module are
 *    initialized (i.e.: state of App is received + functions for contente
 *    scripts are executed in the frame).
 * 3. injection of content scripts (defined in `core/content/run.es`) waits to
 *    receive the state of the App (from background side). This is achieved
 *    through a mechanism described in the same file.
 * 4. with App's state known, enabled modules are injected and can *optionally*
 *    return "content actions". These can be thought of as equivalent to actions
 *    defined on modules' backgrounds, but this time in content scripts.
 * 5. once we know the actions from all injected modules, these are passed to
 *    `ContentScriptActionsManager` which starts listening for messages and
 *    forwards requests to appropriate actions.
 * 6. the responses (if any) are returned using the promise-based API of
 *    `onMessage` and will resolve the promise returned by `sendMessage` on the
 *    other side (or reject if an exception is encountered)
 *
 * To define these actions, content scripts injected via `registerContentScript`
 * need to return an object where keys are names of actions and values are
 * callback functions which will be invoked whenever an action is received from
 * background.
 *
 * In `content.es`:
 *
 *    registerContentScript({
 *      module: 'myModule',
 *      matches: ['<all_urls>'],
 *      js: [() => ({
 *        action: (payload) => {
 *          console.log('action was requested from background', payload);
 *        }
 *      })],
 *    });
 *
 * From background code:
 *
 *    import inject from '../core/kord/inject';
 *
 *    inject.module('core').action(
 *      'callContentAction',
 *      'myModule', // module name
 *      'action', // action name
 *      { windowId: tabId }, // target tab
 *      { foo: 42 }, // the `payload`
 *    );
 */

import RemoteActionProvider from '../../core/helpers/remote-action-provider';
import runtime from '../../platform/runtime';

/**
 * Buffers messages received through `onMessage` API in memory until content
 * scripts are injected and actions can be triggered. Once actions are
 * available, we first re-play in-memory messages, then start listening to new
 * one.
 */
class RemoteMessagesBuffer {
  // Maximum number of action messages to buffer in memory before content
  // scripts are injected. This limit should never be reached but is still
  // necessary to make sure we do not leak memory in case status from App cannot
  // be received (which should not happen either).
  MAX_BUFFER_LEN = 5000;

  constructor() {
    this.buffer = [];

    // Start buffering until we get `actions` for content scripts
    this.onMessage = (message) => {
      if (this.buffer.length < this.MAX_BUFFER_LEN) {
        return new Promise((resolve, reject) => {
          this.buffer.push({
            message,
            resolve,
            reject,
          });
        });
      }

      return Promise.reject(new Error(
        `content-script actions buffer limit exceeded: ${this.buffer.length} ${this.MAX_BUFFER_LEN}`
      ));
    };
  }

  init() {
    runtime.onMessage.addListener(this.onMessage);
  }

  unload() {
    runtime.onMessage.removeListener(this.onMessage);
  }
}

/**
 * Buffers messages in memory until `actions` are specified then switches to
 * using `RemoteActionProvider` for each module to handle remote actions
 * requested by background code.
 */
export default class ContentScriptActionsManager {
  constructor() {
    // Not defined at first
    this.actions = null;

    // Start buffering messages in memory until we know about actions. The flow
    // here is this:
    //
    // 1. here (i.e.: `constructor`) we initialize `messageHandlers` as being a
    // single in-memory queue of messages received from other contexts, before
    // we know of registered content actions.
    // 2. in `setActionCallbacks(...)` we receive actions registered by injected
    // content scripts (see core/sources/content/run.es).
    // 3. the `unload(...)` method is called to remove the listener, then a new
    // remote action provider is created for each module having a content script
    // injected (e.g.: `anti-phishing`, `adblocker`, etc.); also replaying all
    // messages stored in-memory before that so that nothing is lost even before
    // we inject content scripts.
    //
    // Even though the array only contains one listener at first, we keep
    // `messageHandlers` as an array so that handling is uniform in the rest of
    // the code (e.g.: `unload(...)`).
    this.messageHandlers = [new RemoteMessagesBuffer()];
    for (const handler of this.messageHandlers) {
      handler.init();
    }
  }

  /**
   * Stop listening to messages
   */
  unload() {
    for (const handler of this.messageHandlers) {
      handler.unload();
    }
    this.messageHandlers = [];
  }

  /**
   * Register action callbacks once content scripts are injected.
   */
  setActionCallbacks(moduleActions) {
    // Stop current buffering of messages in memory
    const messages = this.messageHandlers[0].buffer;
    this.unload();

    // Replay messages received so far with actual module actions
    for (const [module, actions] of Object.entries(moduleActions)) {
      const actionProvider = new RemoteActionProvider(module, actions);
      for (const { message, resolve, reject } of messages) {
        const response = actionProvider.onMessage(message);
        if (response !== undefined) {
          response.then(resolve).catch(reject);
        }
      }

      // Start listening
      actionProvider.init();
      this.messageHandlers.push(actionProvider);
    }
  }
}
