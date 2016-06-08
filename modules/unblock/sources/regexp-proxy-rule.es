
export default class {
  constructor(expr, proxy_to, region) {
    this.expr = expr;
    this.id = expr.toString();
    this.proxy_to = proxy_to;
    this.proxy_region = region || "";
  }

  matches(url) {
    return this.expr.test(url);
  }
};