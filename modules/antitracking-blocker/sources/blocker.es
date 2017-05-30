import console from '../core/console';
import md5 from '../antitracking/md5';
import ResourceLoader from '../core/resource-loader';

export default class {

  constructor(blocklist) {
    this.blocklist = blocklist || 'default';
    this.patterns = {};
  }

  init() {
    const fileName = `bugs_${this.blocklist}.json`;
    this._blockListLoader = new ResourceLoader(['antitracking-blocker', fileName], {
      remoteURL: `https://cdn.cliqz.com/anti-tracking/${fileName}`,
      cron: 1000 * 60 * 60 * 12,
    });
    const loadFn = this.loadBugs.bind(this);
    this._blockListLoader.onUpdate(loadFn);
    this._blockListLoader.load().then(loadFn);
    return Promise.resolve();
  }

  loadBugs(bugs) {
    this.patterns = bugs.patterns;
  }

  unload() {
    if (this._blockListLoader) {
      this._blockListLoader.stop();
    }
  }

  ruleMatches(urlParts) {
    const hostPartsReversed = urlParts.hostname.split('.').reverse();
    return this.hostRuleMatches(hostPartsReversed) ||
      this.hostPathRuleMatches(hostPartsReversed, urlParts.path);
  }

  hostRuleMatches(hostPartsReversed) {
    let root = this.patterns.host;
    if (!root) return false;
    for (let i = 0; i < hostPartsReversed.length; i += 1) {
      const part = hostPartsReversed[i];
      if (!root[part]) {
        break;
      }
      root = root[part];
      if (root.$) {
        console.log('blocklist', 'match host', hostPartsReversed.join('.'));
        return true;
      }
    }
    return false;
  }

  hostPathRuleMatches(hostPartsReversed, path) {
    let root = this.patterns.host_path;
    if (!root) return false;
    const pathHash = md5(path).substring(0, 16);
    let match = false;
    for (let i = 0; i < hostPartsReversed.length; i += 1) {
      const part = hostPartsReversed[i];
      if (root[part]) {
        root = root[part];
      }

      if (root.$) {
        match = Number.isInteger(root.$) || (root.$ || []).some(rule => `/${rule.path}` === path);
        if (match) {
          console.log('blocklist', 'match', hostPartsReversed.join('.'), path);
          break;
        }
      }
      if (root['#']) {
        match = root['#'].some(hash => hash === pathHash);
        if (match) {
          console.log('blocklist', 'match hash', hostPartsReversed.join('.'), path);
          break;
        }
      }
    }
    return match;
  }

  checkBlockRules(state, _resp) {
    if (this.ruleMatches(state.urlParts)) {
      const response = _resp;
      response.cancel = true;
      state.incrementStat('blocked_blocklist');
      state.incrementStat(`matched_blocklist_${this.blocklist}`);
      return false;
    }
    return true;
  }
}
