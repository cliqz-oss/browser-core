/**
  Enables filtered events on http requests, with associated urls
 */
export default class {
  /**
  * @class RequestListener
  * @namespace unblock
  * @constructor
  */
  constructor() {
    this.pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
      .getService(Components.interfaces.nsIProtocolProxyService);
    this.pps.registerFilter(this, 0);
    this.subscribed = []
  }

  /**
  * @method destroy
  */
  destroy() {
    this.pps.unregisterFilter(this);
  }
  /**
  * @method applyFilter
  * @param pps
  * @param url {string}
  * @param default_proxy
  * @returns default_proxy
  */
  applyFilter(pps, url, default_proxy) {
    this.subscribed.filter(function(m) {
      if ('text' in m) {
        return url.asciiSpec.indexOf(m.text) > -1;
      }
      return false;
    }).forEach(function(m) {
      m.callback(url.asciiSpec);
    });
    return default_proxy;
  }

  subscribe(matcher) {
    this.subscribed.push(matcher);
  }
}
