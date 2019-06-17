/* global window */
import App from '../core/app';
import config from '../core/config';

const CLIQZ = {};
CLIQZ.app = new App({
  version: chrome.runtime.getManifest().version
});
window.CLIQZ = CLIQZ;

CLIQZ.app.start();

window.addEventListener('unload', () => {
  CLIQZ.app.stop();
});

const offboardingUrls = config.settings.offboardingURLs;

if (offboardingUrls && offboardingUrls.en) {
  const locale = chrome.i18n.getUILanguage();
  // Use English as default
  const offboardingUrl = offboardingUrls[locale] || offboardingUrls.en;
  chrome.runtime.setUninstallURL(offboardingUrl);
}
