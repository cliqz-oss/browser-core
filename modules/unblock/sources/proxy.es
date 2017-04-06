import CliqzUtils from 'core/utils';

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
    let rule_match = this.rules.find(function(rule) {
      return rule.matches(url.asciiSpec);
    });
    if (rule_match != undefined) {
      CliqzUtils.telemetry({
        'type': 'unblock',
        'action': 'proxy',
        'to_region': rule_match.proxy_region
      });
      return rule_match.proxy_to;
    }
    return default_proxy;
  }

  createProxy({ host,
                type = 'http',
                port = 3128,
                failover_timeout = 2000,
                failover_proxy = null }) {
    return this.pps.newProxyInfo(type, host, port, null, failover_timeout, failover_proxy);
  }
  /**
  * @method addProxyRule
  * @param rule
  */
  addProxyRule(rule) {
    this.removeProxyRule(rule.id);
    return this.rules.push(rule);
  }
  /**
  * @method removeProxyRule
  * @param rule
  */
  removeProxyRule(rule) {
    let index = this.rules.indexOf(rule);
    return index >=0 ? this.rules.splice(index, 1) : null;
  }
  /**
  * @method clearRules
  */
  clearRules() {
    this.rules = [];
  }
};
