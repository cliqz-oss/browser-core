import { Components } from './globals';

export default class {
  constructor({ position } = { position: 0 }) {
    this.position = position;
    this.pps = Components.classes['@mozilla.org/network/protocol-proxy-service;1']
      .getService(Components.interfaces.nsIProtocolProxyService);
  }

  init() {
    this.pps.registerFilter(this, this.position);
  }

  /**
   * Disable all proxy rules provided by this instance
   * @method destroy
   */
  unload() {
    this.pps.unregisterFilter(this);
  }

  /**
   * See https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIProtocolProxyService
   */
  newProxy(args) {
    // Do not perform DNS lookups on the client, but on the proxy (server-side).
    // Otherwise, it is hard to whitelist our services.
    // (This option is equivalent to 'socks5h://' in curl).
    const flags = Components.interfaces.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST;

    return this.pps.newProxyInfo(args.type, args.host, args.port, flags,
                                 args.failoverTimeout, args.failoverProxy);
  }

  /**
   * Firefox proxy API entry point - called on new http(s) connection.
   * @method applyFilter
   * @param pps
   * @param url {string}
   * @param defaultProxy
   * @returns aProxy
   */
  applyFilter(pps, url, defaultProxy, cb) {
    const proxy = this.shouldProxy(url) ? this.proxy() : defaultProxy;
    // On Firefox 60+ we need to use the callback
    if (cb && cb.onProxyFilterResult) {
      cb.onProxyFilterResult(proxy);
    } else {
      return proxy;
    }
    return undefined;
  }
}
