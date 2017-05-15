
export default class {

  constructor(config) {
    this.config = config;
  }

  checkBadSubdomain(state, response) {
    const subdomainRewriteRules = this.config.subdomainRewriteRules || {};
    const requestHost = state.urlParts.hostname;
    const rules = Object.keys(subdomainRewriteRules);
    for (let i = 0; i < rules.length; i += 1) {
      const rule = rules[i];
      if (requestHost.endsWith(rule)) {
        const newUrl = state.url.replace(requestHost, subdomainRewriteRules[rule]);
        response.redirectTo(newUrl);
        return false;
      }
    }
    return true;
  }
}
