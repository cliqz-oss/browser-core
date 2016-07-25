export default class {
  /**
  * @class RegexProxyRule
  * @namespace unblock
  * @constructor
  */
  constructor(expr, proxy_to, region) {
    this.expr = expr;
    this.id = expr.toString();
    this.proxy_to = proxy_to;
    this.proxy_region = region || "";
  }
  /**
  * @method matches
  * @param url {string}
  */
  matches(url) {
    return this.expr.test(url);
  }
};
