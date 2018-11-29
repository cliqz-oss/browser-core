/* eslint no-restricted-properties: 'off' */

import {
  registerContentScript,
} from '../core/content/helpers';
// TODO: not this
// import { sameGeneralDomain } from '../core/tlds';

// override of documentcookie based on privacy badger clobbercookie implementation
// https://github.com/EFForg/privacybadger/blob/master/src/js/contentscripts/clobbercookie.js
function isNotHtml(window) {
  const document = window.document;
  return document instanceof window.HTMLDocument === false && (
    document instanceof window.XMLDocument === false
    || document.createElement('div') instanceof window.HTMLDivElement === false);
}

function clobberCookie() {
  document.__defineSetter__('cookie', () => { });
  document.__defineGetter__('cookie', () => '');
}

function insertCookieOverride(document) {
  const code = `(${clobberCookie.toString()})();`;
  const parent = document.documentElement;
  const script = document.createElement('script');

  script.text = code;
  script.async = false;

  parent.insertBefore(script, parent.firstChild);
  parent.removeChild(script);
}

function getGeneralDomain(hostname) {
  // a very bad implementation of general domain
  if (!hostname) {
    return '';
  }
  const hostParts = hostname.split('.');
  const gd = hostParts.slice(Math.max(0, hostParts.length - 2), hostParts.length).join('.');
  return gd;
}

registerContentScript('antitracking', 'http*', (window, chrome, CLIQZ) => {
  const attrack = CLIQZ.app.modules.antitracking;
  if (!attrack.isEnabled || !attrack.state.cookieBlockingEnabled
      || !attrack.state.compatibilityList) {
    return;
  }
  // ghostery pause
  if (CLIQZ.app.modules.ghostery
    && (
      CLIQZ.app.modules.ghostery.state.paused
      || CLIQZ.app.modules.ghostery.state.whitelisted.indexOf(window.self.location.hostname) !== -1
    )
  ) {
    return;
  }
  if (window.self !== window.top) {
    try {
      const refererHost = new URL(document.referrer).hostname;
      const parentGd = getGeneralDomain(refererHost);
      const selfGd = getGeneralDomain(window.self.location.hostname);
      if (selfGd === parentGd || isNotHtml(window)
          || (attrack.state.compatibilityList[selfGd]
          && attrack.state.compatibilityList[selfGd].indexOf(parentGd) !== -1)) {
        return;
      }
    } catch (e) {
      // if referer is not a url, assume third-party
    }
    insertCookieOverride(window.document);
  }
});
