/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Implement broadcast capability to send messages to all currently injected
 * content scripts in the browser from the background. This is used to
 * communicate either with all windows/pages or specific ones. The
 * ContentCommunicationManager is instantiated in `core/background` and its APIs
 * are not exposed directly to most modules; instead, core's background wraps
 * them into high level functions (a.k.a.: asynchronous actions) like `getHTML`
 * which other modules can use.
 */

import { browser } from './globals';
import runtime from './runtime';

import console from '../core/console';
import inject from '../core/kord/inject';
import { equals as urlEquals } from '../core/url';

/**
 * Listen to messages from content scripts, call background actions requested
 * and return back results from these action.
 */
function handleRequest(message, sender) {
  const { module, action, args = [] } = message;
  if (module === undefined || action === undefined) {
    // Here we just ignore the message as it might be handled by a different
    // listener. `handleRequest` should only answer when `message` is an action
    // request.
    return undefined;
  }

  return inject.module(module).action(action, ...args, sender);
}

export default class ContentCommunicationManager {
  init() {
    runtime.onMessage.addListener(handleRequest);
  }

  unload() {
    runtime.onMessage.removeListener(handleRequest);
  }

  callContentAction(module, action, { windowId, url, frameId }, ...args) {
    if (windowId !== undefined) {
      return this.broadcastToWindow(windowId, {
        module,
        action,
        args,
      }, frameId || 0);
    }

    if (url !== undefined) {
      return this.broadcastToUrl(url, {
        module,
        action,
        args,
      });
    }

    return Promise.reject(new Error('callContentAction expects either "url" or "windowId" to be specified'));
  }

  broadcastToWindow(windowId, msg, frameId = 0) {
    return browser.tabs.sendMessage(windowId, msg, { frameId });
  }

  async broadcastToUrl(url, msg) {
    const candidates = (await browser.tabs.query({})).filter(tab => urlEquals(tab.url, url));

    if (candidates.length === 0) {
      console.log('No tab found for url:', url);
      return Promise.resolve();
    }

    if (candidates.length > 1) {
      console.log('Found more than one tab for url:', url, candidates);
    }

    return Promise.all(candidates.map(({ id }) => browser.tabs.sendMessage(
      id,
      msg,
      { frameId: 0 },
    ))).then(responses => (responses.length === 1 ? responses[0] : responses));
  }

  /**
   * Dispatch `msg` according to `channel` and optional `msg.url` or
   * `msg.windowId` (i.e.: tabId)
   */
  broadcast(channel, msg) {
    if (channel === 'cliqz:core') {
      if (msg.url !== undefined) {
        return this.broadcastToUrl(msg.url, msg);
      }

      if (msg.windowId !== undefined) {
        return this.broadcastToWindow(msg.windowId, msg);
      }

      return Promise.reject(new Error(`broadcast(...) expects either 'url' or 'windowId' to be specified: ${msg}`));
    }

    if (!channel) {
      return runtime.sendMessage(msg);
    }

    return Promise.reject(new Error(`call to broadcast with unknown channel ${channel}`));
  }
}
