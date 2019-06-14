import App from '../core/app';
import { newTab, query } from '../platform/tabs';
import { chrome, window } from '../platform/globals';
import telemetry from '../core/services/telemetry';
import config from '../core/config';
import prefs from '../core/prefs';
import { ONBOARDING_URL, OFFBOARDING_URL } from './common/constant';

const CLIQZ = {};

CLIQZ.app = new App({
  version: chrome.runtime.getManifest().version
});
CLIQZ.app.start().then(() => {
  const session = encodeURIComponent(prefs.get('session'));
  const url = new URL(OFFBOARDING_URL);
  url.searchParams.append('session', session);
  chrome.runtime.setUninstallURL(url.href);
});
window.CLIQZ = CLIQZ;


function sendInstallSignal(referrerUrl, advertId, error) {
  telemetry.push({
    type: 'activity',
    action: 'install',
    referrer_url: referrerUrl,
    advert_id: advertId,
    error
  }, undefined, true);
}

async function onboarding(details) {
  if (details.reason === 'install' && config.settings.channel !== '99') {
    // Set an extra parameter if on a development mode
    if (config.settings.channel === 'MO02') {
      const url = new URL(ONBOARDING_URL);
      url.searchParams.append('debug', true);
      await newTab(url.href, { focus: true });
    } else {
      await newTab(ONBOARDING_URL, { focus: true });
    }
    CLIQZ.app.ready().then(() => {
      telemetry.push({
        type: 'activity',
        action: 'onboarding-show',
      });
      query({ url: 'https://myoffrz.com/lp*' }).then((tabs) => {
        tabs.forEach((tab) => {
          const url = new URL(tab.url);
          sendInstallSignal(url.pathname + url.search, url.searchParams.get('pk_campaign'));
        });
        if (tabs.length === 0) {
          sendInstallSignal('', 'no-referal');
        }
      }).catch((err) => {
        sendInstallSignal('', '', err.message);
      });
    });
  }
}

chrome.runtime.onInstalled.addListener(onboarding);

window.addEventListener('unload', () => {
  CLIQZ.app.stop();
  chrome.runtime.onInstalled.removeListener(onboarding);
});
