import { httpGet } from '../core/http';
import prefs from '../core/prefs';
import CliqzAntiPhishing from './anti-phishing';
import background from '../core/base/background';
import inject from '../core/kord/inject';
import * as datetime from '../antitracking/time';
import console from '../core/console';
import telemetry from '../core/services/telemetry';
import pacemaker from '../core/services/pacemaker';

function addDataToUrl(...args) {
  const hw = inject.module('human-web');
  return hw.action('addDataToUrl', ...args);
}

function updateBlackWhiteStatus(req, md5Prefix) {
  const hour = datetime.getTime();
  const response = req.response;
  const blacklist = JSON.parse(response).blacklist;
  const whitelist = JSON.parse(response).whitelist;
  const blackWhiteList = CliqzAntiPhishing.blackWhiteList.value;
  if (!(blackWhiteList[md5Prefix])) {
    blackWhiteList[md5Prefix] = {
      h: hour,
    };
  }
  for (let i = 0; i < blacklist.length; i += 1) {
    blackWhiteList[md5Prefix][blacklist[i][0]] = `black:${blacklist[i][1]}`;
  }
  for (let i = 0; i < whitelist.length; i += 1) {
    blackWhiteList[md5Prefix][whitelist[i]] = 'white';
  }
  CliqzAntiPhishing.blackWhiteList.setDirty();
}

function checkStatus(url, md5Prefix, md5Surfix) {
  const blackWhiteList = CliqzAntiPhishing.blackWhiteList.value;
  const bw = blackWhiteList[md5Prefix];
  const status = md5Surfix in bw && bw[md5Surfix].includes('black');
  if (status) {
    addDataToUrl(url, 'anti-phishing', 'block')
      .catch(() => console.log('failed to update url', url));
  }
  return status;
}

export default background({
  requiresServices: ['pacemaker'],
  core: inject.module('core'),
  init(/* settitng */) {
    CliqzAntiPhishing.init();
    this.CliqzAntiPhishing = CliqzAntiPhishing;
  },

  unload() {
    CliqzAntiPhishing.unload();
  },

  beforeBrowserShutdown() {
    CliqzAntiPhishing.unload();
  },

  actions: {
    isPhishingURL(url) {
      if (!CliqzAntiPhishing.isAntiPhishingActive()) {
        return Promise.resolve({
          block: false,
          type: 'phishingURL',
        });
      }

      const [md5Prefix, md5Surfix] = CliqzAntiPhishing.getSplitMd5(url);

      // check if whitelisted
      const forceWhiteList = CliqzAntiPhishing.forceWhiteList.value;
      if (md5Prefix in forceWhiteList) {
        if (forceWhiteList[md5Prefix] === CliqzAntiPhishing.WHITELISTED_TEMPORARY) {
          pacemaker.setTimeout(() => {
            delete forceWhiteList[md5Prefix];
          }, 1000);
        }
        return Promise.resolve({
          block: false,
          type: 'phishingURL',
        });
      }

      // check cache
      CliqzAntiPhishing.clearBWList();
      const blackWhiteList = CliqzAntiPhishing.blackWhiteList.value;
      if (blackWhiteList[md5Prefix] && blackWhiteList[md5Prefix][md5Surfix]
      && !blackWhiteList[md5Prefix][md5Surfix].startsWith('suspicious')) {
        return Promise.resolve({
          block: checkStatus(url, md5Prefix, md5Surfix),
          type: 'phishingURL',
        });
      }
      return new Promise((resolve, reject) => {
        httpGet(
          CliqzAntiPhishing.BW_URL + md5Prefix,
          (req) => {
            updateBlackWhiteStatus(req, md5Prefix);
            resolve({
              block: checkStatus(url, md5Prefix, md5Surfix),
              type: 'phishingURL',
            });
          },
          (e) => {
            reject(e);
          },
          3000
        );
      });
    },

    activator(state, url) {
      switch (state) {
        case 'active':
          CliqzAntiPhishing.removeForceWhitelist(url);
          prefs.set('cliqz-anti-phishing-enabled', true);
          break;
        case 'off_website':
        case 'inactive':
          prefs.set('cliqz-anti-phishing-enabled', true);
          CliqzAntiPhishing.whitelist(url);
          break;
        case 'critical':
        case 'off_all':
          CliqzAntiPhishing.removeForceWhitelist(url);
          prefs.set('cliqz-anti-phishing-enabled', false);
          break;
        default:
          break;
      }
    },

    telemetry(target) {
      const signal = {
        type: 'anti-phishing',
        action: 'click',
        target,
      };
      telemetry.push(signal);
    },

    markAsSafe(url) {
      CliqzAntiPhishing.markAsSafe(url);
    },

    whitelistTemporary(url) {
      CliqzAntiPhishing.whitelistTemporary(url);
    },
  },

  events: {
    'human-web:active-url': function onActiveUrl(...args) {
      return CliqzAntiPhishing.onHwActiveURL(...args);
    },
  }
});
