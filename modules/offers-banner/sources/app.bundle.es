/* global window */
import App from '../core/app';
import { newTab, query } from '../platform/tabs';
import moment from '../platform/lib/moment';
import { getDaysSinceInstall } from '../core/demographics';
import { dateToDaysSinceEpoch } from '../core/helpers/date';
import utils from '../core/utils';
import prefs from '../core/prefs';
import config from '../core/config';
import { chrome } from '../platform/globals';

const ONBOARDING_URL = 'https://myoffrz.com/on-boarding/';
const OFFBOARDING_URL = 'https://myoffrz.com/off-boarding/';
const INFO_INTERVAL = 60 * 60 * 1e3; // 1 hour

function sendEnvironmentalSignal({ startup, instantPush }) {
  const navigator = window.navigator;
  let days;
  getDaysSinceInstall().then((syncDays) => {
    days = syncDays;
  }).catch(() => {
    days = dateToDaysSinceEpoch(moment());
  }).then(() => {
    const info = {
      type: 'environment',
      agent: navigator.userAgent,
      language: navigator.language,
      version: utils.extensionVersion,
      startup,
      isDefaultBrowser: utils.isDefaultBrowser,
      private_window: utils.isPrivateMode(window),
      install_date: days,
    };
    utils.telemetry(info, instantPush);
  });
}
const whoAmItimer = setInterval(
  sendEnvironmentalSignal.bind(this, { startup: false, instantPush: false }),
  INFO_INTERVAL
);

const CLIQZ = {};
CLIQZ.app = new App({
  version: chrome.runtime.getManifest().version
});
CLIQZ.app.start().then(() => {
  sendEnvironmentalSignal({ startup: true, instantPush: true });
  // We need to wait for the first telemetry push before setting the outboarding url
  const session = encodeURIComponent(prefs.get('session'));
  const url = new URL(OFFBOARDING_URL);
  url.searchParams.append('session', session);
  chrome.runtime.setUninstallURL(url.href);
});
window.CLIQZ = CLIQZ;

function sendInstallSignal(referrerUrl, advertId, error) {
  utils.telemetry({
    type: 'activity',
    action: 'install',
    referrer_url: referrerUrl,
    advert_id: advertId,
    error
  }, true);
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

    utils.telemetry({
      type: 'activity',
      action: 'onboarding-show',
    }, true);
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
  }
}

chrome.runtime.onInstalled.addListener(onboarding);

window.addEventListener('unload', () => {
  CLIQZ.app.stop();
  chrome.runtime.onInstalled.removeListener(onboarding);
  clearInterval(whoAmItimer);
});
