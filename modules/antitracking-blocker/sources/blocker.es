import console from '../core/console';
import md5 from '../core/helpers/md5';
import ResourceLoader from '../core/resource-loader';
import domainInfo from '../core/services/domain-info';
import config from '../core/config';

export const BLOCK_MODE = ['BLOCK', 'ALLOW_SAFE', 'ALLOW_UNSAFE'].reduce(
  (hash, val) => Object.assign(hash, { [val]: val }),
  Object.create(null)
);

export default class Blocker {
  constructor(blocklist, defaultAction, categoryPolicies, companyPolicies, firstPartyPolicies) {
    this.blocklist = blocklist || 'default';
    this.defaultAction = BLOCK_MODE[defaultAction] || BLOCK_MODE.BLOCK;
    this.patterns = {};
    this.bugs = {};
    this.apps = {};
    this.categoryPolicies = categoryPolicies;
    this.companyPolicies = companyPolicies;
    this.firstPartyPolicies = firstPartyPolicies;
  }

  init() {
    const fileName = `bugs_${this.blocklist}.json`;
    this._blockListLoader = new ResourceLoader(['antitracking-blocker', fileName], {
      remoteURL: `${config.settings.CDN_BASEURL}/anti-tracking/${fileName}`,
      cron: 1000 * 60 * 60 * 12,
    });
    const loadFn = this.loadBugs.bind(this);
    this._blockListLoader.onUpdate(loadFn);
    this._blockListLoader.load().then(loadFn);
    return Promise.resolve();
  }

  loadBugs(bugs) {
    this.patterns = bugs.patterns;
    if (bugs.bugs) {
      this.bugs = bugs.bugs;
    }
    if (bugs.apps) {
      this.apps = bugs.apps;
    }
  }

  unload() {
    if (this._blockListLoader) {
      this._blockListLoader.stop();
    }
  }

  ruleMatches(urlParts) {
    const hostPartsReversed = urlParts.hostname.split('.').reverse();
    return this.hostRuleMatches(hostPartsReversed)
      || this.hostPathRuleMatches(hostPartsReversed, urlParts.path);
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
        return root.$ || true;
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
        if (Number.isInteger(root.$)) {
          match = root.$;
        } else {
          const findMatch = (root.$ || []).find(rule => path.indexOf(rule.path) === 1);
          match = findMatch ? findMatch.id : false;
        }
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

  checkBlockRules(_state, _response) {
    const state = _state;
    const response = _response;
    const match = this.ruleMatches(state.urlParts);
    if (match) {
      state.blocklistMatch = true;
      state.incrementStat(`matched_blocklist_${this.blocklist}`);
      if (Number.isInteger(match) && state.getPageAnnotations) {
        state.app = match;
        const annotations = state.getPageAnnotations();
        if (!annotations.apps) {
          annotations.apps = new Map();
        }
        if (!annotations.apps.has(match)) {
          annotations.apps.set(match, false);
        }
        response.apps = annotations.apps.size;
        response.shouldIncrementCounter = true;
      }
    }
    return true;
  }

  applyBlockRules(state, response) {
    if (state.blocklistMatch) {
      let action = this.defaultAction;
      if (state.app) {
        const company = domainInfo.getBugOwner(state.app);
        // rule precedence: company > category > default
        action = this._getOverrideAction(state.tabUrlParts.hostname, company.name, company.cat)
         || action;
        const annotations = state.getPageAnnotations();
        if (annotations.apps) {
          annotations.apps.set(state.app, action);
        }
      }
      switch (action) {
        case BLOCK_MODE.BLOCK:
          state.incrementStat('blocked_blocklist');
          response.block();
          return false;
        case BLOCK_MODE.ALLOW_UNSAFE:
          return false;
        default:
          return true;
      }
    }
    return true;
  }

  _getOverrideAction(firstParty, trackerName, trackerCategory) {
    const fpPolicy = this.firstPartyPolicies[firstParty]
        && (this.firstPartyPolicies[firstParty].company[trackerName]
          || this.firstPartyPolicies[firstParty].category[trackerCategory]);
    return fpPolicy || this.companyPolicies[trackerName]
      || this.categoryPolicies[trackerCategory] || undefined;
  }
}
