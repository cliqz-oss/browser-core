
export default class {

  constructor(config) {
    this.config = config;
  }

  get qsBlockRule() {
    return this.config.blockRules || [];
  }

  shouldBlock(host, sourceHost) {
    for (var i = 0; i < this.qsBlockRule.length; i++) {
      var sRule = this.qsBlockRule[i][0],
          uRule = this.qsBlockRule[i][1];
      if (sourceHost.endsWith(sRule) &&
        host.endsWith(uRule)) {
        return true
      }
    }
    return false;
  }

  applyBlockRules(state, response) {
    if (this.shouldBlock(state.urlParts.hostname, state.sourceUrlParts.hostname)) {
      state.incrementStat('req_rule_aborted')
      response.cancel = true;
      return false;
    }
    return true;
  }
}
