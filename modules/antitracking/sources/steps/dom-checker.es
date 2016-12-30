import pacemaker from 'antitracking/pacemaker';
import core from 'core/background';
import { dURIC } from 'antitracking/url';

const DOM_CHECK_PERIOD = 1000;


function isTabURL(url) {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
          .getService(Components.interfaces.nsIWindowMediator);
  var browserEnumerator = wm.getEnumerator("navigator:browser");

  while (browserEnumerator.hasMoreElements()) {
      var browserWin = browserEnumerator.getNext();
      var tabbrowser = browserWin.gBrowser;

      var numTabs = tabbrowser.browsers.length;
      for (var index = 0; index < numTabs; index++) {
          var currentBrowser = tabbrowser.getBrowserAtIndex(index);
          if (currentBrowser) {
              var tabURL = currentBrowser.currentURI.spec;
              if (url == tabURL || url == tabURL.split('#')[0]) {
                  return true;
              }
          }
      }
  }
  return false;
}

// from CliqzAttrack.getCookieValues
function getCookieValues(c, url) {
  if (c == null) {
      return {};
  }
  var v = 0, cookies = {};
  if (c.match(/^\s*\$Version=(?:"1"|1);\s*(.*)/)) {
      c = RegExp.$1;
      v = 1;
  }
  if (v === 0) {
      c.split(/[,;]/).map(function(cookie) {
          var parts = cookie.split(/=/);
          if (parts.length > 1) parts[1] = parts.slice(1).join('=');
          var name = dURIC(parts[0].trimLeft()),
              value = parts.length > 1 ? dURIC(parts[1].trimRight()) : null;
          cookies[name] = value;
      });
  } else {
      c.match(/(?:^|\s+)([!#$%&'*+\-.0-9A-Z^`a-z|~]+)=([!#$%&'*+\-.0-9A-Z^`a-z|~]*|"(?:[\x20-\x7E\x80\xFF]|\\[\x00-\x7F])*")(?=\s*[,;]|$)/g).map(function($0, $1) {
      var name = $0,
          value = $1.charAt(0) === '"'
                    ? $1.substr(1, -1).replace(/\\(.)/g, "$1")
                    : $1;
          cookies[name] = value;
      });
  }
  // return cookies;
  var cookieVal = {};
  for (var key in cookies) {
      if (url.indexOf(cookies[key]) == -1) { // cookies save as part of the url is allowed
          cookieVal[cookies[key]] = true;
      }
  }
  return cookieVal;
}

export default class {

  constructor() {
    this.loadedTabs = {};
    this.linksRecorded = {};// cache when we recorded links for each url
    this.linksFromDom = {};
    this.cookiesFromDom = {}
  }

  init() {
    this._pmTask = pacemaker.register(function cleanCaches(currTime) {
      const cacheObj = this.linksRecorded;
      const timeout = 1000;
      const keys = Object.keys(cacheObj)
      keys.forEach(function(k) {
        if (currTime - cacheObj[k] || 0 > timeout) {
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
      for(var c in getCookieValues(state.requestContext.getRequestHeader('Cookie'), state.url)) {
        cookievalue[c] = true;
      }
    } catch(e) {}
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
      return
    }
    this.linksRecorded[url] = now;
    return Promise.all([

      core.actions.getCookie(url).then(
        cookie => self.cookiesFromDom[url] = cookie
      ),

      Promise.all([
        core.actions.queryHTML(url, 'a[href]', 'href'),
        core.actions.queryHTML(url, 'link[href]', 'href'),
        core.actions.queryHTML(url, 'script[src]', 'src').then(function (hrefs) {
          return hrefs.filter( href => href.indexOf('http') === 0 );
        }),
      ]).then(function (reflinks) {
        var hrefSet = reflinks.reduce((hrefSet, hrefs) => {
          hrefs.forEach( href => hrefSet[href] = true );
          return hrefSet;
        }, {});

        self.linksFromDom[url] = hrefSet;
      })
    ]);
  }

  onTabLocationChange(evnt) {
    const url = evnt.url;

    this.linksFromDom[url] = {};

    if (evnt.isLoadingDocument) {
      // when a new page is loaded, try to extract internal links and cookies
      var doc = evnt.document;
      this.loadedTabs[url] = false;

      if(doc) {
        if (doc.body) {
          this.recordLinksForURL(url);
        }
        doc.addEventListener(
          'DOMContentLoaded',
          (ev) => {
            this.loadedTabs[url] = true;
            this.recordLinksForURL(url);
          });
        this.clearDomLinks();
      }
    }
  }

  clearDomLinks() {
    for (var url in this.linksFromDom) {
      if (!isTabURL(url)) {
        delete this.linksFromDom[url];
        delete this.cookiesFromDom[url];
        delete this.loadedTabs[url];
      }
    }
  }
}
