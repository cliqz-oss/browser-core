/* eslint no-restricted-syntax: 'off' */
/* eslint no-param-reassign: 'off' */

import prefs from '../core/prefs';
import md5 from '../core/helpers/md5';
import inject from '../core/kord/inject';
import fetch from '../platform/fetch';
import { LazyPersistentObject } from '../core/persistent-state';
import * as datetime from '../antitracking/time';
import config from '../core/config';
import console from '../core/console';

function queryHTML(...args) {
  const core = inject.module('core');
  return core.action('queryHTML', ...args);
}

function getHTML(...args) {
  const core = inject.module('core');
  return core.action('getHTML', ...args);
}

function addDataToUrl(...args) {
  const hw = inject.module('human-web');
  return hw.action('addDataToUrl', ...args);
}

function checkPassword(url, callback) {
  const suspicious = queryHTML(url, 'input', 'type,value,name').then(
    inputs => inputs.some(
      input => Object.keys(input).some(
        attr => attr === 'password' || attr === 'passwort'
      )
    )
  );

  if (suspicious) {
    callback(url, 'password');
  }
}

function checkSingleScript(script) {
  if (!script) {
    return false;
  }

  // if someone try to get the current date
  if (script.indexOf('getTime') > -1
      && script.indexOf('getDay') > -1
      && script.indexOf('getDate') > -1) {
    return true;
  }

  // if someone try to block exiting
  if (script.indexOf('onbeforeunload') > -1) {
    return true;
  }

  if (script.indexOf('downloadEXEWithName') > -1) {
    return true;
  }
  return false;
}

function checkHTML(url, callback) {
  getHTML(url).then((htmls) => {
    const html = htmls[0];

    if (!html) {
      return;
    }

    if ((html.indexOf('progress-bar-warning') > -1
        && html.indexOf('progress-bar-success') > -1
        && html.indexOf('buffer-progress') > -1)
        || html.indexOf('play-progress') > -1
    ) {
      callback(url, 'cheat');
      return;
    }

    if (html.indexOf('security') > -1
        && html.indexOf('update') > -1
        && html.indexOf('account') > -1) {
      callback(url, 'password');
    }
  });
}

function checkScript(url, callback) {
  const domain = url.replace('http://', '')
    .replace('https://', '').split('/')[0];

  queryHTML(url, 'script', 'src').then((srcs) => {
    const suspicious = srcs.filter(src => src).some((src) => {
      // if the script is from the same domain, fetch it
      const dm = src.replace('http://', '').replace('https://', '').split('/')[0];

      if (dm !== domain) {
        return null;
      }

      return fetch(src)
        .then(response => response.text())
        .then(text => checkSingleScript(text));
    });

    if (suspicious) {
      callback(url, 'script');
    }
  });

  queryHTML(url, 'script', 'innerHTML').then((scripts) => {
    if (scripts.some(checkSingleScript)) {
      callback(url, 'script');
    }
  });
}

function checkSuspicious(url, callback) {
  checkScript(url, callback);
  checkHTML(url, callback);
  checkPassword(url, callback);
}

function getDomainMd5(url) {
  const domain = url.replace('http://', '').replace('https://', '').split('/')[0];
  return md5(domain);
}


/**
 * This module injects warning message when user visits a phishing site
 * @class AntiPhishing
 * @namespace anti-phishing
 */
const CliqzAntiPhishing = {
  WHITELISTED_NONE: 0,
  WHITELISTED_SAFE: 1,
  WHITELISTED_TEMPORARY: 2,
  WHITELISTED_PERMANENTLY: 3,
  BW_URL: config.settings.BW_URL,
  DELAY: 24,
  forceWhiteList: new LazyPersistentObject('anti-phishing-fw'),
  blackWhiteList: new LazyPersistentObject('anti-phishing-bw'),

  init() {
    CliqzAntiPhishing.blackWhiteList.load();
    CliqzAntiPhishing.clearBWList();
    CliqzAntiPhishing.forceWhiteList.load();
  },

  clearBWList() {
    const bwList = CliqzAntiPhishing.blackWhiteList.value;
    const hour = datetime.newUTCDate();
    hour.setHours(hour.getHours() - CliqzAntiPhishing.DELAY);
    const hourCutoff = datetime.hourString(hour);

    for (const prefix in bwList) {
      if ('h' in bwList[prefix]) {
        if (bwList[prefix].h < hourCutoff) {
          delete bwList[prefix];
          CliqzAntiPhishing.blackWhiteList.setDirty();
        }
      } else {
        // this one does not have a timestampe, suppose it's out of date
        delete bwList[prefix];
        CliqzAntiPhishing.blackWhiteList.setDirty();
      }
    }
  },

  unload() {
    CliqzAntiPhishing.saveLists();
  },

  clear() {
    CliqzAntiPhishing.clearBlackWhitelist();
    CliqzAntiPhishing.clearForceWhitelist();
  },

  saveLists() {
    CliqzAntiPhishing.blackWhiteList.save();
    CliqzAntiPhishing.forceWhiteList.save();
  },

  getSplitMd5(url) {
    const urlMd5 = getDomainMd5(url);
    const md5Prefix = urlMd5.substring(0, urlMd5.length - 16);
    const md5Surfix = urlMd5.substring(16, urlMd5.length);
    return [md5Prefix, md5Surfix];
  },

  onHwActiveURL(msg) {
    const url = msg.activeURL;
    const [md5Prefix, md5Surfix] = CliqzAntiPhishing.getSplitMd5(url);
    if (CliqzAntiPhishing.blackWhiteList[md5Prefix]
      && CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix]) {
      // don't update if the status is already set
      return;
    }
    checkSuspicious(url, CliqzAntiPhishing.updateSuspiciousStatus);
  },

  whitelist(url, tp) {
    tp = tp || CliqzAntiPhishing.WHITELISTED_PERMANENTLY;
    const md5Prefix = CliqzAntiPhishing.getSplitMd5(url)[0];
    const forceWhiteList = CliqzAntiPhishing.forceWhiteList.value;
    forceWhiteList[md5Prefix] = tp;
    CliqzAntiPhishing.forceWhiteList.setDirty();
  },

  whitelistTemporary(url) {
    CliqzAntiPhishing.whitelist(url, CliqzAntiPhishing.WHITELISTED_TEMPORARY);
  },

  markAsSafe(url) {
    CliqzAntiPhishing.whitelist(url, CliqzAntiPhishing.WHITELISTED_SAFE);
  },

  getUrlWhitelistStatus(url) {
    const md5Prefix = CliqzAntiPhishing.getSplitMd5(url)[0];
    const forceWhiteList = CliqzAntiPhishing.forceWhiteList.value;
    return forceWhiteList[md5Prefix] || CliqzAntiPhishing.WHITELISTED_NONE;
  },

  isInWhitelist(url) {
    return CliqzAntiPhishing.getUrlWhitelistStatus(url)
      !== CliqzAntiPhishing.WHITELISTED_NONE;
  },

  removeForceWhitelist(url) {
    const md5Prefix = CliqzAntiPhishing.getSplitMd5(url)[0];
    const forceWhiteList = CliqzAntiPhishing.forceWhiteList.value;
    if (md5Prefix in forceWhiteList) {
      delete forceWhiteList[md5Prefix];
      CliqzAntiPhishing.forceWhiteList.setDirty();
    }
  },

  clearForceWhitelist() {
    CliqzAntiPhishing.forceWhiteList.value = {};
    CliqzAntiPhishing.forceWhiteList.setDirty();
  },

  clearBlackWhitelist() {
    CliqzAntiPhishing.blackWhiteList.value = {};
    CliqzAntiPhishing.blackWhiteList.setDirty();
  },

  isInABTest() {
    return prefs.get('cliqz-anti-phishing', false);
  },

  isAntiPhishingActive() {
    return prefs.get('cliqz-anti-phishing-enabled', true);
  },

  updateSuspiciousStatus(url, status) {
    const blackWhiteList = CliqzAntiPhishing.blackWhiteList.value;
    const [md5Prefix, md5Surfix] = CliqzAntiPhishing.getSplitMd5(url);

    if (blackWhiteList[md5Prefix] && blackWhiteList[md5Prefix][md5Surfix]) {
      // don't update if the status is already set
      return;
    }

    if (!(blackWhiteList[md5Prefix])) {
      blackWhiteList[md5Prefix] = {};
    }

    blackWhiteList[md5Prefix][md5Surfix] = `suspicious:${status}`;
    CliqzAntiPhishing.blackWhiteList.setDirty();
    addDataToUrl(url, 'isMU', status).catch(() => console.log('failed to update url', url));
  },
};

export default CliqzAntiPhishing;
