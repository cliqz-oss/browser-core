import { getRandomIntInclusive }from 'hpn/utils';
import CliqzSecureMessage from 'hpn/main';
/*
Picked up from unblock proxy.es
*/

export default class {
  /**
  * Wrapper for rule-based url proxying: implementation for Firefox
  * @class Proxy
  * @namespace unblock
  * @constructor
  */
  constructor() {
    this.pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
      .getService(Components.interfaces.nsIProtocolProxyService);
    this.pps.registerFilter(this, 1);
    this.rules = [];
    this.method = "socks";
    this.port = 9004;
  }

  /**
  * Disable all proxy rules provided by this instance
  * @method destroy
  */
  destroy() {
    this.pps.unregisterFilter(this);
  }

  /**
  * Firefox proxy API entry point - called on new http(s) connection.
  * @method applyFilter
  * @param pps
  * @param url {string}
  * @param default_proxy
  * @returns default_proxy
  */

  applyFilter(pps, url, default_proxy) {

    if(url.scheme === "https" &&
        (CliqzSecureMessage.servicesToProxy.indexOf(url.host) > -1) &&
        (CliqzUtils.getPref('hpn-query', false) || CliqzUtils.isOnPrivateTab(CliqzUtils.getWindow()))
      ) {
      return this.getQueryProxy();
    } else {
      return default_proxy;
    }
  }

  getQueryProxy() {
    if (!CliqzSecureMessage.proxyList) return;
    const proxyIdx = getRandomIntInclusive(0,3);
    const proxyIP = CliqzSecureMessage.proxyList[proxyIdx];
    CliqzUtils.log("Proxying Query: " + proxyIP);


    if (CliqzSecureMessage.proxyInfoObj[proxyIP]) {
      return CliqzSecureMessage.proxyInfoObj[proxyIP];
    } else {
      let ob = this.pps.newProxyInfo(this.method, proxyIP, this.port, null, 1000, null);
      CliqzSecureMessage.proxyInfoObj[proxyIP] = ob;
      return ob;
    }
  }
};
