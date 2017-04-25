import ResourceLoader from 'core/resource-loader';

const URL_BLOCK_RULES = 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-block-rules.json';

export default class {

  constructor(blockRulesUrl) {
    this.blockRulesUrl = blockRulesUrl || URL_BLOCK_RULES;
    this.qsBlockRule = [];
    this._blockRulesLoader = new ResourceLoader( ['antitracking', 'anti-tracking-block-rules.json'], {
      remoteURL: this.blockRulesUrl,
      cron: 24 * 60 * 60 * 1000,
    });
  }

  init() {
    const updateRules = (rules) => { this.qsBlockRule = rules || []};
    this._blockRulesLoader.load().then(updateRules);
    this._blockRulesLoader.onUpdate(updateRules);
  }

  unload() {
    this._blockRulesLoader.stop();
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
