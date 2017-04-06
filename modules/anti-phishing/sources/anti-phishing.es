import CliqzHumanWeb from '../human-web/human-web';
import utils from '../core/utils';
import md5 from '../core/helpers/md5';
import inject from '../core/kord/inject';

function queryHTML(...args) {
  const core = inject.module('core');
  return core.action('queryHTML', ...args);
}

function getHTML(...args) {
  const core = inject.module('core');
  return core.action('getHTML', ...args);
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
  if (script.indexOf('getTime') > -1 &&
      script.indexOf('getDay') > -1 &&
      script.indexOf('getDate') > -1) {
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

    if (html.indexOf('progress-bar-warning') > -1
        && html.indexOf('progress-bar-success') > -1
        || html.indexOf('play-progress') > -1
        && html.indexOf('buffer-progress') > -1) {

      callback(url, 'cheat');
      return;
    }

    if (html.indexOf('security') > -1 &&
        html.indexOf('update') > -1 &&
        html.indexOf('account') > -1) {
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

      const req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
      req.open('GET', src, false);
      req.send('null');

      const script = req.responseText;
      return checkSingleScript(script);
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

function notifyHumanWeb(p) {
  const url = p.url;
  const status = p.status;
  try {
    CliqzHumanWeb.state.v[url].isMU = status;
  } catch (e) {
    console.log(`error while change hw state for ${url} ${e}`);
  }
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
  BW_URL: 'https://antiphishing.cliqz.com/api/bwlist?md5=',
  forceWhiteList: {},
  blackWhiteList: {},

  getSplitMd5(url) {
    const urlMd5 = getDomainMd5(url);
    const md5Prefix = urlMd5.substring(0, urlMd5.length - 16);
    const md5Surfix = urlMd5.substring(16, urlMd5.length);
    return [md5Prefix, md5Surfix];
  },

  onHwActiveURL(msg) {
    const url = msg.activeURL;
    checkSuspicious(url, CliqzAntiPhishing.updateSuspiciousStatus);
  },

  whitelist(url, tp) {
    const md5Prefix = CliqzAntiPhishing.getSplitMd5(url)[0];
    CliqzAntiPhishing.forceWhiteList[md5Prefix] = tp;
  },

  isAntiPhishingActive() {
    return utils.getPref('cliqz-anti-phishing-enabled', false);
  },

  updateSuspiciousStatus(url, status) {
    const [md5Prefix, md5Surfix] = CliqzAntiPhishing.getSplitMd5(url);
    if (!(md5Prefix in CliqzAntiPhishing.blackWhiteList)) {
      CliqzAntiPhishing.blackWhiteList[md5Prefix] = {};
    }
    if (CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix]) {
      // don't update if the status is already set
      return;
    }
    CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix] = `suspicious:${status}`;
    if (CliqzHumanWeb) {
      const p = {
        url,
        status,
      };

      if (CliqzHumanWeb.state.v[url]) {
        notifyHumanWeb(p);
      } else {
        utils.setTimeout(notifyHumanWeb, 1000, p);
      }
    }
  },
};

export default CliqzAntiPhishing;
