/* eslint no-param-reassign: 'off' */
/* eslint no-restricted-syntax: 'off' */
/* eslint prefer-arrow-callback: 'off' */

import { isTabURL } from '../../platform/browser';
import pacemaker from '../../core/services/pacemaker';
import core from '../../core/background';
import { dURIC } from '../../core/url-info';

const DOM_CHECK_PERIOD = 1000;


// from CliqzAttrack.getCookieValues
function getCookieValues(c, url) {
  if (c === null || c === undefined) {
    return {};
  }
  let v = 0;
  const cookies = {};
  if (c.match(/^\s*\$Version=(?:"1"|1);\s*(.*)/)) {
    c = RegExp.$1;
    v = 1;
  }
  if (v === 0) {
    c.split(/[,;]/).forEach((cookie) => {
      const parts = cookie.split(/=/);
      if (parts.length > 1) parts[1] = parts.slice(1).join('=');
      const name = dURIC(parts[0].trimLeft());
      const value = parts.length > 1 ? dURIC(parts[1].trimRight()) : null;
      cookies[name] = value;
    });
  } else {
    c
      .match(/(?:^|\s+)([!#$%&'*+\-.0-9A-Z^`a-z|~]+)=([!#$%&'*+\-.0-9A-Z^`a-z|~]*|"(?:[\x20-\x7E\x80\xFF]|\\[\x00-\x7F])*")(?=\s*[,;]|$)/g)
      .forEach(($0, $1) => {
        const name = $0;
        const value = $1.charAt(0) === '"'
          ? $1.substr(1, -1).replace(/\\(.)/g, '$1')
          : $1;
        cookies[name] = value;
      });
  }
  // return cookies;
  const cookieVal = {};
  for (const key in cookies) {
    if (url.indexOf(cookies[key]) === -1) { // cookies save as part of the url is allowed
      cookieVal[cookies[key]] = true;
    }
  }
  return cookieVal;
}

export default class DomChecker {
  constructor() {
    this.loadedTabs = {};
    this.linksRecorded = {};// cache when we recorded links for each url
    this.linksFromDom = {};
    this.cookiesFromDom = {};
  }

  init() {
    this._pmTask = pacemaker.register(function cleanCaches(currTime) {
      const cacheObj = this.linksRecorded;
      const timeout = 1000;
      const keys = Object.keys(cacheObj);
      keys.forEach((k) => {
        if (currTime - cacheObj[k] || timeout < 0) {
          delete cacheObj[k];
        }
      });
    }.bind(this), 2 * 60 * 1000);
  }

  unload() {
    pacemaker.deregister(this._pmTask);
  }

  checkDomLinks(state) {
    this.recordLinksForURL(state.sourceUrl);

    // check if this url appears in the source's links
    const reflinks = this.linksFromDom[state.sourceUrl] || {};
    if (state.incrementStat && state.url in reflinks) {
      state.incrementStat('url_in_reflinks');
    }
    return true;
  }

  parseCookies(state) {
    const sourceUrl = state.sourceUrl;
    let cookievalue = {};
    // parse cookies from DOM
    if (this.cookiesFromDom[sourceUrl]) {
      cookievalue = getCookieValues(this.cookiesFromDom[sourceUrl], state.url);
    }
    // merge with cookies in the header of this request
    try {
      const cVal = getCookieValues(state.getRequestHeader('Cookie'), state.url);
      for (const c in cVal) {
        if (Object.prototype.hasOwnPrototype.call(cVal, c)) {
          cookievalue[c] = true;
        }
      }
    } catch (e) {
      // empty
    }
    state.cookieValues = cookievalue;

    return true;
  }

  recordLinksForURL(url) {
    const self = this;
    if (this.loadedTabs[url]) {
      return;
    }
    const now = Date.now();
    const lastQuery = this.linksRecorded[url] || 0;
    if (now - lastQuery < DOM_CHECK_PERIOD) {
      return;
    }
    this.linksRecorded[url] = now;
    Promise.all([
      core.actions.getCookie(url).then(
        (cookie) => { self.cookiesFromDom[url] = cookie; }
      ),

      Promise.all([
        core.actions.queryHTML(url, 'a[href]', 'href'),
        core.actions.queryHTML(url, 'link[href]', 'href'),
        core.actions.queryHTML(url, 'script[src]', 'src').then(hrefs =>
          hrefs.filter(href => href.indexOf('http') === 0)),
      ]).then((reflinks) => {
        const hrefSet = reflinks.reduce((_hrefSet, hrefs) => {
          hrefs.forEach((href) => { _hrefSet[href] = true; });
          return _hrefSet;
        }, {});

        self.linksFromDom[url] = hrefSet;
      })
    ]).catch(() => {});
  }

  clearDomLinks() {
    for (const url in this.linksFromDom) {
      if (!isTabURL(url)) {
        delete this.linksFromDom[url];
        delete this.cookiesFromDom[url];
        delete this.loadedTabs[url];
      }
    }
  }
}
