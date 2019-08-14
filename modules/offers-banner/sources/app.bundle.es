import App from '../core/app';
import { newTab } from '../platform/tabs';
import { chrome, window } from '../platform/globals';
import telemetry from '../core/services/telemetry';
import config from '../core/config';
import prefs from '../core/prefs';
import Defer from '../core/helpers/defer';
import { ONBOARDING_URL, ONBOARDING_URL_DEBUG, OFFBOARDING_URL, DISTROS_TO_SESSION } from './common/constant';
import { guessDistributionDetails, guessDistributionChannel } from './attribution';

const CLIQZ = {};
const DEBUG = config.settings.channel === 'MO02';
const appCreated = new Defer();

(async () => {
  await prefs.init();
  if (!prefs.has('offers.distribution.channel')) {
    const rawChannel = await guessDistributionChannel();
    prefs.set('offers.distribution.channel', rawChannel);
    prefs.set('offers.distribution.channel.ID', DISTROS_TO_SESSION[rawChannel] || '');
  }

  CLIQZ.app = new App({
    version: chrome.runtime.getManifest().version + prefs.get('offers.distribution.channel.ID', '')
  });

  CLIQZ.app
    .start()
    .then(() => {
      const session = encodeURIComponent(prefs.get('session'));
      const url = new URL(OFFBOARDING_URL);
      url.searchParams.append('session', session);
      chrome.runtime.setUninstallURL(url.href);
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.name === 'appReady') {
          sendResponse({ ready: true });
        }
      });
    });

  window.CLIQZ = CLIQZ;
  appCreated.resolve();
})();

function triggerOnboardingOffers() {
  const intentName = 'Segment.Onboarding';
  const durationSec = 60 * 60; // 1 hour
  CLIQZ.app.modules['offers-v2'].action('triggerOfferByIntent', intentName, durationSec);
}

async function onboarding(details) {
  if (details.reason === 'install' && config.settings.channel !== '99') {
    await appCreated.promise; // we must wait for the CLIQZ.app object to be created
    await CLIQZ.app.ready();
    await newTab(DEBUG ? ONBOARDING_URL_DEBUG : ONBOARDING_URL, { focus: true });
    telemetry.push({
      type: 'activity',
      action: 'onboarding-show',
    });

    triggerOnboardingOffers();
    guessDistributionDetails();
  }
}

chrome.runtime.onInstalled.addListener(onboarding);

window.addEventListener('unload', () => {
  CLIQZ.app.stop();
  chrome.runtime.onInstalled.removeListener(onboarding);
});
