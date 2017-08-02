/* global System */
import { loadPrefs, setPref, getPref } from './prefs';
import console from '../core/console';
import App from '../core/app';
import bridge from './native-bridge';
import CliqzAttrack from '../antitracking/attrack';
import CliqzAdblock from '../adblocker/adblocker';
import { setGlobal } from '../core/kord/inject';
import utils from '../core/utils';
import ABTests from "../core/ab-tests";
import domainInfo, { getBugOwner } from '../core/domain-info';

var app;

const startup = loadPrefs().then(() => {
  app = new App();
  return app.load();
}).then(() => {
  const aggregatedBlockingStats = (tabId) => {
    const info = CliqzAttrack.getAppsForTab(tabId);
    let adbBlocked = new Set();
    if (CliqzAdblock.adbStats && CliqzAdblock.adbStats.tabs.get(tabId)) {
      adbBlocked = CliqzAdblock.adbStats.tabs.get(tabId).blockedDomains;
    }
    adbBlocked.forEach((tld) => {
      const id = domainInfo.domains[tld];
      if (id) {
        info.known[id] = true;
      } else {
        info.unknown[tld] = true;
      }
    });

    const stats = {}

    Object.keys(info.known || {}).forEach((bugId) => {
      const company = getBugOwner(bugId);
      if (!stats[company.cat]) {
        stats[company.cat] = {};
      }
      stats[company.cat][company.name] = info.known[bugId];
    });

    Object.keys(info.unknown).forEach((tld) => {
      if (!stats.unknown) {
        stats.unknown = {};
      }
      stats.unknown[tld] = info.unknown[tld];
    });

    console.log('xxx', stats);
    return stats;
  };
  bridge.registerAction('antitracking:getTrackerListForTab', (tab) => {
    aggregatedBlockingStats(tab);
    return CliqzAttrack.getTrackerListForTab(tab);
  });
  bridge.registerAction('aggregatedBlockingStats', aggregatedBlockingStats);
  bridge.registerAction('antitracking:isSourceWhitelisted', (domain) => {
    return CliqzAttrack.isSourceWhitelisted(domain);
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

  // register background actions
  Object.keys(app.availableModules).filter(mod => app.availableModules[mod].background && app.availableModules[mod].background.actions)
  .forEach((mod) => {
    const actions = app.availableModules[mod].background.actions;
    Object.keys(actions).forEach((action) => {
      console.log('native bridge', `register function ${mod}:${action}`);
      bridge.registerAction(`${mod}:${action}`, actions[action]);
    });
  });

  bridge.registerAction('getTrackerListForTab', CliqzAttrack.getTrackerListForTab);
  bridge.registerAction('getPref', getPref);
  bridge.registerAction('setPref', setPref);
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
