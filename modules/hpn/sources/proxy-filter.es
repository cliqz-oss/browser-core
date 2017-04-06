import CliqzUtils from '../core/utils';
import console from '../core/console';
import ProxyFilter from '../platform/proxy-filter';
import { getRandomIntInclusive }from './utils';
import CliqzSecureMessage from './main';
/*
Picked up from unblock proxy.es
*/

export default class extends ProxyFilter {
  /**
  * Wrapper for rule-based url proxying: implementation for Firefox
  * @class Proxy
  * @namespace unblock
  * @constructor
  */
  constructor() {
    super();
    this.method = "socks";
    this.port = 9004;
  }

  shouldProxy(url) {
    const window = CliqzUtils.getWindow();
    return (url.scheme === "https") &&
      (CliqzSecureMessage.servicesToProxy.indexOf(url.host) > -1) &&
      (
        CliqzUtils.getPref('hpn-query', false) ||
        CliqzUtils.isOnPrivateTab(window)
      );
  }

  proxy() {
    if (!CliqzSecureMessage.proxyList) {
      return;
    }
    const proxyIdx = getRandomIntInclusive(0,3);
    const proxyIP = CliqzSecureMessage.proxyList[proxyIdx];
    console.log("Proxying Query: " + proxyIP);

    if (CliqzSecureMessage.proxyInfoObj[proxyIP]) {
      return CliqzSecureMessage.proxyInfoObj[proxyIP];
    } else {
      const ob = this.newProxy(this.method, proxyIP, this.port, null, 1000, null);
      CliqzSecureMessage.proxyInfoObj[proxyIP] = ob;
      return ob;
    }
  }
};
