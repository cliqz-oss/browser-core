import telemetry from '../core/services/telemetry';
import { query, getCurrentTab } from '../platform/tabs';
import { chrome } from '../platform/globals';
import prefs from '../core/prefs';
import { DISTRIBUTION_STORES, DISTRIBUTION_CHANNELS, DISTROS_TO_SESSION } from './common/constant';
import logger from './logger';

// TODO 19.08.2019
// should we remove this and rely on the environment.offers?
const sendInstallSignal = (referrerUrl, advertId, error) => {
  telemetry.push({
    type: 'activity',
    action: 'install',
    referrer_url: referrerUrl,
    advert_id: advertId,
    error
  }, undefined, true);
};

const wait = (timeout, retVal) => new Promise((resolve) => {
  setTimeout(resolve, timeout, retVal);
});

// returns the current focused tab inside an array of one element
const getCurrentUrl = async () => [(await getCurrentTab()).url];

// filters all the open tabs using the known stores
// eg: query({ url: ['https://chrome.google.com/*', 'https://addons.mozilla.org/*']})
const getTabsWithStoreUrls = async () =>
  (await query({ url: DISTRIBUTION_STORES.map(s => `https://${s.host}/*`) }))
    .map(tab => tab.url);

// returns all the history entries for a particular host
// for the last 24 hours (default for chrome.history.search api)
const getHistoryForStore = async store =>
  new Promise((resolve) => {
    if (chrome.history && chrome.history.search) {
      // history API is not available on chrome and placed "Under Consideration" (02.07.2019)
      // https://docs.microsoft.com/en-us/microsoft-edge/extensions/api-support/extension-api-roadmap
      chrome.history.search({ text: `https://${store.host}/` }, resolve);
    } else {
      resolve([]);
    }
  });

// returns all the history entries which from all the known stores
const getHistoryWithStoreUrls = async () =>
  (await DISTRIBUTION_STORES.reduce(async (accP, curr) =>
    (await accP).concat(await getHistoryForStore(curr)),
  [])).map(history => history.url);

// decodes the channel from a list of store URLs
export const getChannelFromURLs = (urls) => {
  for (let i = 0; i < urls.length; i += 1) {
    const url = new URL(urls[i]);

    for (const store of DISTRIBUTION_STORES) {
      if (
        // be sure this is a secure connection
        url.protocol === 'https:'
        // check if it is a known store
        && url.host === store.host
        // check if the addon is known
        && url.pathname.includes(store.addonMatcher)
      ) {
        return {
          channel: url.searchParams.get(store.queryUtmSource),
          subchannel: url.searchParams.get(store.queryUtmSubChannel)
        };
      }
    }
  }

  return {
    channel: null,
    subchannel: null
  };
};


/*
  we try to guess the distribution using a prioritized
  set of rulles - first one matching wins!

  1. active tab
  2. open tabs
  3. history
*/

const PRIORITY = [
  getCurrentUrl,
  getTabsWithStoreUrls,
  getHistoryWithStoreUrls
];

const EMPTY_CHANNEL = {
  clean: '',
  ID: '',
  sub: ''
};

// using the priority list above we try to guess
// the distribution channel. The valid store url with the highest priority
// will win even if there is an invalid/unknown url source parameter
async function _guessDistributionChannel() {
  try {
    for (let i = 0; i < PRIORITY.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const target = await PRIORITY[i]();
      const channelDetails = getChannelFromURLs(target);
      if (channelDetails.channel) {
        logger.log(`found channel "${channelDetails.channel}" for url "${target}"`);
        // 'channel' comes from an external URL and it can cause some damage
        // if its value will be something like 'constructor' or 'toString' or related
        // the URL is something like:
        //      -> https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-test
        // and 'source' would be 'external-test'
        // to mittigate this typeof DISTRIBUTION_CHANNELS is a Map
        const cleanChannel = DISTRIBUTION_CHANNELS.get(channelDetails.channel) || '';
        return {
          clean: cleanChannel,
          ID: DISTROS_TO_SESSION[cleanChannel] || '',
          sub: channelDetails.subchannel || ''
        };
      }
    }
  } catch (e) {
    // we wait for guessDistributionChannel to finish before app starts
    // therefore in case anything fails we should continue anyhow
    logger.log(`something went wrong in guessDistributionChannel: ${e.message}`);
  }

  return EMPTY_CHANNEL;
}

export async function guessDistributionChannel() {
  // we only wait for 2 seconds for this guess detection because the whole
  // app waits for it to finish
  return Promise.race([_guessDistributionChannel(), wait(2000, EMPTY_CHANNEL)]);
}

export default async function guessDistributionDetails() {
  try {
    const knownChampaigns = query({ url: 'https://myoffrz.com/lp*' });
    knownChampaigns.forEach((tab) => {
      const url = new URL(tab.url);
      sendInstallSignal(url.pathname + url.search, url.searchParams.get('pk_campaign'));
      // there should be only one! ;-)
      prefs.set('offers.distribution.referrer_url', url.pathname + url.search);
      prefs.set('offers.distribution.advert_id', url.searchParams.get('pk_campaign'));
    });
    if (knownChampaigns.length === 0) {
      sendInstallSignal('', 'no-referal');
    }
  } catch (err) {
    sendInstallSignal('', '', err.message);
  }
}
