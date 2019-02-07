/* global window */
import App from '../core/app';
import config from '../core/config';

async function cleanLegacyDatabases() {
  if (chrome.cliqzdbmigration) {
    await chrome.cliqzdbmigration.deleteDatabase('antitracking');
    await chrome.cliqzdbmigration.deleteDatabase('cliqz-adb');
    await chrome.cliqzdbmigration.deleteDatabase('anolysis');
  }
}

function migratePrefs() {
  return new Promise((resolve) => {
    const PREFS_KEY = 'cliqzprefs';
    if (chrome.cliqzmigration) {
      chrome.storage.local.get([PREFS_KEY], (result = {}) => {
        const prefs = (result && result[PREFS_KEY]) || {};
        if (prefs.isMigrated) {
          resolve();
          return;
        }

        chrome.cliqzmigration.getPrefs((oldPrefs) => {
          Object.assign(prefs, oldPrefs);
          prefs.isMigrated = true;
          chrome.storage.local.set({ [PREFS_KEY]: prefs });
          // chrome.cliqzmigration.purge(resolve);
          resolve();
        });
        cleanLegacyDatabases();
      });
    } else {
      resolve();
    }
  });
}

const CLIQZ = {};
CLIQZ.app = new App({
  version: chrome.runtime.getManifest().version
});
window.CLIQZ = CLIQZ;

migratePrefs().then(() => {
  CLIQZ.app.start();

  window.addEventListener('unload', () => {
    CLIQZ.app.stop();
  });
});

if (config.settings.showOffboarding) {
  chrome.runtime.setUninstallURL(config.settings.UNINSTALL);
}
