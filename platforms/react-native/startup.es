/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NativeModules } from 'react-native';
import { setPref, getPref } from './prefs';
import console from '../core/console';
import App from '../core/app';
import Bridge from './native-bridge';
import crypto from './crypto';
import { fromBase64, toBase64 } from '../core/encoding';
import inject from '../core/kord/inject';
import logos from '../core/services/logos';
import modules from '../core/app/modules';
import window from './window';
import webRequest from './webrequest';

const Crypto = NativeModules.Crypto;

let app;

const seedPromise = Promise.resolve()
  .then(() => {
    if (!Crypto || !Crypto.generateRandomSeed) {
      const randFallback = new Uint8Array(128);
      for (let i = 0; i < 128; i += 1) {
        randFallback[i] = Math.floor(Math.random() * 256);
      }
      return toBase64(randFallback);
    }
    return Crypto.generateRandomSeed();
  })
  .then((seed) => {
    const x = fromBase64(seed);
    if (x.length === 128 && crypto.subtle._seed) {
      crypto.subtle._seed(x);
    } else {
      throw new Error('Error in initial seed: not 128 bytes or crypto.subtle._seed is not present');
    }
  });

const bridge = new Bridge();

const startup = Promise.all([seedPromise]).then(() => {
  app = new App();
  // register background actions
  Object.keys(app.modules)
    .filter(mod => modules[mod].Background
                  && modules[mod].Background.actions)
    .forEach((mod) => {
      const actions = modules[mod].Background.actions;
      const injectedModule = inject.module(mod);
      Object.keys(actions).forEach((action) => {
        console.log('native bridge', `register function ${mod}:${action}`);
        bridge.registerAction(`${mod}:${action}`, injectedModule.action.bind(injectedModule, action));
      });
    });
  return app.start();
}).then(() => {
  bridge.registerAction('core:getPref', (prefname, defaultValue) =>
    getPref(prefname, defaultValue));
  bridge.registerAction('core:setPref', setPref);
  bridge.registerAction('getLogoDetails',
    url => logos.getLogoDetails(url));
  bridge.registerAction('webRequest', webRequest.onBeforeRequest._trigger.bind(webRequest.onBeforeRequest));
  if (app.modules.search) {
    return app.modules.search.getWindowLoadingPromise(window);
  }
  return Promise.resolve();
}).then(() => {
  bridge.activate();
  return app;
});

export default startup;
