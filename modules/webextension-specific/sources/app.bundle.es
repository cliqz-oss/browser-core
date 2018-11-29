/* global window */
import App from '../core/app';

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
          Object.assign(prefs, oldPrefs, prefs);
          prefs.isMigrated = true;
          chrome.storage.local.set({ [PREFS_KEY]: prefs });
          chrome.cliqzmigration.purge(resolve);
        });
      });
    } else {
      resolve();
    }
  });
}

const CLIQZ = {};

migratePrefs().then(() => {
  CLIQZ.app = new App({
    version: chrome.runtime.getManifest().version
  });

  CLIQZ.app.start();
  window.CLIQZ = CLIQZ;

  window.addEventListener('unload', () => {
    CLIQZ.app.stop();
  });
});
