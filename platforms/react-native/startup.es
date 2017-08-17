/* global System */
import { loadPrefs, setPref, getPref } from './prefs';
import console from '../core/console';
import App from './app';
import bridge from './native-bridge';
import CliqzAttrack from '../antitracking/attrack';
import CliqzAdblock from '../adblocker/adblocker';
import { setGlobal } from '../core/kord/inject';
import utils from '../core/utils';
import ABTests from "../core/ab-tests";

var app;

const startup = loadPrefs().then(() => {
  app = new App();
  setGlobal(app);
  return app.load();
}).then(() => {
  bridge.registerAction('antitracking:getTrackerListForTab', CliqzAttrack.getTrackerListForTab);
  bridge.registerAction('antitracking:isSourceWhitelisted', (domain) => {
    return CliqzAttrack.isSourceWhitelisted(domain)
  });
  bridge.registerAction('antitracking:addSourceDomainToWhitelist', CliqzAttrack.addSourceDomainToWhitelist);
  bridge.registerAction('antitracking:removeSourceDomainFromWhitelist', CliqzAttrack.removeSourceDomainFromWhitelist);
  bridge.registerAction('core:getPref', (prefname, defaultValue) => {
    return getPref(prefname, defaultValue)
  });
  bridge.registerAction('core:setPref', setPref);
  bridge.registerAction('adblocker:getAdBlockInfo', CliqzAdblock.adbStats.report.bind(CliqzAdblock.adbStats));
  bridge.registerAction('adblocker:isDomainInBlacklist', (domain) => {
    if (CliqzAdblock.adBlocker) {
      console.log('isDomainInBlacklist -- adblocker exists.')
      return CliqzAdblock.adBlocker.isDomainInBlacklist(domain);
    }
    console.log('isDomainInBlacklist -- return default value')
    return false;
  });
  bridge.registerAction('adblocker:toggleUrl', (url,domain) => {
    if (CliqzAdblock.adBlocker) {
      CliqzAdblock.adBlocker.toggleUrl(url,domain)
    }
    else{
      console.log('toggleUrl -- adblocker is undefined')
    }
  });
  return Promise.resolve(app);
}).then(() => {
  // get config hourly
  utils.setInterval(utils.fetchAndStoreConfig, 60 * 60 * 1e3);
  utils.fetchAndStoreConfig();
  // load ABtests
  // ABTests.check();
  return Promise.resolve(app);
});

export default startup;
