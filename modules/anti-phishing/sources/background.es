/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint func-names: 'off' */

import { httpGet } from '../core/http';
import prefs from '../core/prefs';
import CliqzAntiPhishing from './anti-phishing';
import background from '../core/base/background';
import inject from '../core/kord/inject';
import * as datetime from '../antitracking/time';
import console from '../core/console';
import telemetry from '../core/services/telemetry';
import pacemaker from '../core/services/pacemaker';
import metrics from './telemetry/metrics';
import logger from './logger';
import { extractHostname } from '../core/tlds';

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

function checkStatus(url, md5Prefix, md5Suffix) {
  const blackWhiteList = CliqzAntiPhishing.blackWhiteList.value;
  const bw = blackWhiteList[md5Prefix];
  const status = md5Suffix in bw && bw[md5Suffix].includes('black');
  if (status) {
    addDataToUrl(url, 'anti-phishing', 'block')
      .catch(() => console.log('failed to update url', url));
  }
  return status;
}

export default background({
  requiresServices: ['pacemaker'],
  core: inject.module('core'),
  async init(/* settitng */) {
    telemetry.register(metrics);
    await CliqzAntiPhishing.init();
    this.CliqzAntiPhishing = CliqzAntiPhishing;
  },

  unload() {
    telemetry.unregister(metrics);
    CliqzAntiPhishing.unload();
  },

  async currentWindowStatus({ url }) {
    const isWhitelisted = CliqzAntiPhishing.isInWhitelist(url);
    const whitelistStatus = CliqzAntiPhishing.getUrlWhitelistStatus(url);
    const active = prefs.get('cliqz-anti-phishing-enabled', true);
    let state = 'active';
    if (isWhitelisted && whitelistStatus !== CliqzAntiPhishing.WHITELISTED_TEMPORARY) {
      state = 'inactive';
    }
    if (!active) {
      state = 'critical';
    }
    return {
      visible: true,
      active,
      isWhitelisted,
      state
    };
  },

  actions: {
    isPhishingURL(url) {
      /**
       * To avoid sending truncated hash for all domains the user visits,
       * we filter them based on the following checks.
       * 1. Is domain already known to be safe? By checking the local BF.
       * 2. Is domain whitelisted:
       *    a. User whitelisted via the Control-Centre.
       *    b. User selected the result from Cliqz drop-down.
       * 3. Already known to be a phishing domain, then show the warning.
       */

      const domain = extractHostname(url);
      if (CliqzAntiPhishing.bloomFilter && CliqzAntiPhishing.bloomFilter.testSingle(domain)) {
        logger.info(`${domain} found in local safe list.`);
        return Promise.resolve({
          block: false,
          type: 'phishingURL',
        });
      }

      if (!CliqzAntiPhishing.isAntiPhishingActive()) {
        return Promise.resolve({
          block: false,
          type: 'phishingURL',
        });
      }

      const [md5Prefix, md5Suffix] = CliqzAntiPhishing.getSplitMd5(url);
      const md5Key = [md5Prefix, md5Suffix];

      // check if whitelisted
      const forceWhiteList = CliqzAntiPhishing.forceWhiteList.value;
      if (md5Key in forceWhiteList) {
        if (forceWhiteList[md5Key] === CliqzAntiPhishing.WHITELISTED_TEMPORARY) {
          pacemaker.setTimeout(() => {
            delete forceWhiteList[md5Key];
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
      if (blackWhiteList[md5Prefix] && blackWhiteList[md5Prefix][md5Suffix]
      && !blackWhiteList[md5Prefix][md5Suffix].startsWith('suspicious')) {
        return Promise.resolve({
          block: checkStatus(url, md5Prefix, md5Suffix),
          type: 'phishingURL',
        });
      }
      return new Promise((resolve, reject) => {
        httpGet(
          CliqzAntiPhishing.BW_URL + md5Prefix,
          (req) => {
            updateBlackWhiteStatus(req, md5Prefix);
            resolve({
              block: checkStatus(url, md5Prefix, md5Suffix),
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
        case 'inactive':
          prefs.set('cliqz-anti-phishing-enabled', true);
          CliqzAntiPhishing.whitelist(url);
          break;
        case 'critical':
          CliqzAntiPhishing.removeForceWhitelist(url);
          prefs.set('cliqz-anti-phishing-enabled', false);
          break;
        default:
          break;
      }
    },

    telemetry(target) {
      telemetry.push({}, `metrics.anti-phishing.click.${target}`);
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
    'ui:click-on-url': function (data) {
      /**
       * Domains served via Cliqz drop-down need not be checked for phishing
       * But we still want to check for cases when the user pastes the URL.
       * Note: The current approach treats history and bookmarks as Cliqz
       * drop-down results.
       */
      if (data.kind && data.kind[0] !== 'navigate-to') {
        CliqzAntiPhishing.whitelistTemporary(data.url);
      }
    }
  }
});
