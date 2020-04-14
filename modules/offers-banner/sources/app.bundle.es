import events from '../core/events';
import runtime from '../platform/runtime';
import App from '../core/app';
import { newTab } from '../platform/tabs';
import { chrome, window } from '../platform/globals';
import telemetry from '../core/services/telemetry';
import pacemaker from '../core/services/pacemaker';
import config from '../core/config';
import prefs from '../core/prefs';
import Defer from '../core/helpers/defer';
import inject from '../core/kord/inject';
import { ONBOARDING_URL, ONBOARDING_URL_DEBUG, OFFBOARDING_URL } from './common/constant';
import { guessDistributionChannel } from './attribution';

const CLIQZ = {};
const DEBUG = config.settings.channel === 'MO02';
const appCreated = new Defer();
let whoAmItimer;

function triggerOnboardingOffers(onInstall) {
  CLIQZ.app.modules['offers-v2'].action('triggerOnboardingOffers', onInstall);
}

function sendEnvironmentalSignal(startup) {
  // this signal is basically a duplicate of environment.offers signal
  // we plan to run them in paralel for 1 version and remove
  // environment.offers if the numbers match
  CLIQZ.app.modules['offers-v2'].action('sendEnvironmentSignal', {
    uuid: prefs.get('session', ''),
    action_id: 'environment',
    startup,
    version: inject.app.version,
    channel: prefs.get('offers.distribution.channel', ''),
    subchannel: prefs.get('offers.distribution.channel.sub', ''),
    agent: navigator.userAgent
  });
}

(async () => {
  await prefs.init();
  if (!prefs.has('offers.distribution.channel')) {
    const channel = await guessDistributionChannel();
    prefs.set('offers.distribution.channel', channel.clean);
    prefs.set('offers.distribution.channel.ID', channel.ID);
    prefs.set('offers.distribution.channel.sub', channel.sub);
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
      runtime.onMessage.addListener((message) => {
        if (message.name === 'appReady') {
          return Promise.resolve({ ready: true });
        }

        return undefined;
      });

      // distribution details are stored in
      // offers.distribution.channel and *.sub
      // but we need to fallback to referrer_url
      // for older users
      telemetry.push({
        type: 'environment.offers',
        version: inject.app.version,
        channel: prefs.get('offers.distribution.channel',
          prefs.get('offers.distribution.referrer_url', '')),
        subchannel: prefs.get('offers.distribution.channel.sub',
          prefs.get('offers.distribution.advert_id', ''))
      }, undefined, true);

      sendEnvironmentalSignal(true);
      whoAmItimer = pacemaker.everyHour(
        sendEnvironmentalSignal.bind(null, false),
      );

      triggerOnboardingOffers(false);
    });

  window.CLIQZ = CLIQZ;
  appCreated.resolve();
})();

async function onboarding(details) {
  if (details.reason === 'install' && config.settings.channel !== '99') {
    await appCreated.promise; // we must wait for the CLIQZ.app object to be created
    await CLIQZ.app.ready();
    const tabId = await newTab(DEBUG ? ONBOARDING_URL_DEBUG : ONBOARDING_URL, { focus: true });

    if (config.settings.SHOW_ONBOARDING_OVERLAY) {
      events.pub('lifecycle:onboarding', { tabId });
    }

    telemetry.push({
      type: 'activity',
      action: 'onboarding-show',
    });

    triggerOnboardingOffers(true);
  }
}

chrome.runtime.onInstalled.addListener(onboarding);

window.addEventListener('unload', () => {
  if (whoAmItimer) {
    whoAmItimer.stop();
    whoAmItimer = null;
  }
  chrome.runtime.onInstalled.removeListener(onboarding);
  CLIQZ.app.stop();
});
