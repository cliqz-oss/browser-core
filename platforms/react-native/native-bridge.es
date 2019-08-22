/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NativeModules, NativeEventEmitter } from 'react-native';
import events from '../core/events';
import console from './console';

const nativeBridge = NativeModules.JSBridge;

/**
 * Makes a synchronous function behave like a promise
 * @param  {Function} fn synchronous function to wrap
 * @return {Function}    Function which wraps a call to this function in a Promise
 */
function makePromise(fn) {
  return (...args) => {
    try {
      const ret = fn(...args);
      return Promise.resolve(ret);
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

export default class Bridge {
  constructor() {
    (nativeBridge.events || []).forEach((event) => {
      events.subscribe(event, (...args) => {
        nativeBridge.pushEvent(event, args);
      });
    });
    this.isActive = false;
    this.eventQueue = [];
    this.registeredActions = {};
    this.eventEmitter = new NativeEventEmitter(nativeBridge);
    this.eventEmitter.addListener('callAction', this.onAction.bind(this));
    this.eventEmitter.addListener('publishEvent', this.onEvent.bind(this));
  }

  onAction({ id, action, args }) {
    const fn = this.registeredActions[action];
    if (!fn) {
      nativeBridge.replyToAction(id, { error: 'invalid action' });
      return;
    }

    const call = fn(...(args || []));
    call.then((ret) => {
      nativeBridge.replyToAction(id, { result: ret });
    }, (e) => {
      console.log('onAction err', e);
      nativeBridge.replyToAction(id, { error: 'exception when running action' });
    });
  }

  onEvent(argument) {
    if (!this.isActive) {
      this.eventQueue.push([argument]);
    } else {
      const { event, args } = argument;
      console.log('broadcast native event', event, args);
      events.pub(event, ...(args || []));
    }
  }

  activate() {
    this.isActive = true;
    this.eventQueue.forEach(eventArgs => this.onEvent(...eventArgs));
    this.eventQueue = [];
  }

  registerAction(name, fn, isPromise) {
    if (this.registeredActions[name] !== undefined) {
      throw new Error('action already exists');
    }
    this.registeredActions[name] = isPromise ? fn : makePromise(fn);
    nativeBridge.registerAction(name);
  }
}
