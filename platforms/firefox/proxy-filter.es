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

  // TODO: add documentation
  newProxy(...args) {
    return this.pps.newProxyInfo(...args);
  }

  /**
   * Firefox proxy API entry point - called on new http(s) connection.
   * @method applyFilter
   * @param pps
   * @param url {string}
   * @param defaultProxy
   * @returns aProxy
   */
  applyFilter(pps, url, defaultProxy) {
    if (this.shouldProxy(url)) {
      return this.proxy();
    }
    return defaultProxy;
  }
}
