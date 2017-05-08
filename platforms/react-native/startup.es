/* global System */
import { loadPrefs, setPref, getPref } from './prefs';
import console from '../core/console';
import App from './app';
import bridge from './native-bridge';
import CliqzAttrack from '../antitracking/attrack';
import CliqzAdblock from '../adblocker/adblocker';
import { setGlobal } from '../core/kord/inject';

var app;

const startup = loadPrefs().then(() => {
  app = new App();
  return app.load();
}).then(() => {
  setGlobal(app);
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
});

export default startup;
