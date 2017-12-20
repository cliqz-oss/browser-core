/* global System */
import { NativeModules, InteractionManager } from 'react-native';
import { loadPrefs, setPref, getPref } from './prefs';
import console from '../core/console';
import App from '../core/app';
import bridge from './native-bridge';
import utils from '../core/utils';
import crypto from './crypto';
import { fromBase64, toBase64 } from '../core/encoding';
import inject from '../core/kord/inject';
import modules from '../core/app/modules';

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

const startup = Promise.all([seedPromise]).then(() => {
  app = new App();
  // register background actions
  Object.keys(app.modules)
  .filter(mod => modules[mod].Background &&
                 modules[mod].Background.actions)
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
    url => utils.getLogoDetails(utils.getDetailsFromUrl(url))
  );

  InteractionManager.runAfterInteractions(utils.fetchAndStoreConfig);
  return app;
});

export default startup;
