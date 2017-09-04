/* global System */
import { loadPrefs, setPref, getPref } from './prefs';
import console from '../core/console';
import App from '../core/app';
import bridge from './native-bridge';
import { setGlobal } from '../core/kord/inject';
import utils from '../core/utils';

var app;

const startup = loadPrefs().then(() => {
  app = new App();
  return app.load();
}).then(() => {
  bridge.registerAction('core:getPref', (prefname, defaultValue) =>
    getPref(prefname, defaultValue));
  bridge.registerAction('core:setPref', setPref);
  // register background actions
  Object.keys(app.availableModules)
  .filter(mod => app.availableModules[mod].background &&
                 app.availableModules[mod].background.actions)
  .forEach((mod) => {
    const actions = app.availableModules[mod].background.actions;
    Object.keys(actions).forEach((action) => {
      console.log('native bridge', `register function ${mod}:${action}`);
      bridge.registerAction(`${mod}:${action}`, actions[action]);
    });
  });
  return Promise.resolve(app);
}).then(() => {
  // get config hourly
  utils.setInterval(utils.fetchAndStoreConfig, 60 * 60 * 1e3);
  // utils.fetchAndStoreConfig();
  // load ABtests
  // ABTests.check();
  return Promise.resolve(app);
});

export default startup;
