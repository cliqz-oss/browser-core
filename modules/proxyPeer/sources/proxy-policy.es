import { getGeneralDomain } from '../antitracking/domain';
import md5 from '../antitracking/md5';
import { asyncResolve, isPrivateIPAddress } from './dns-utils';
import { BloomFilter } from '../platform/bloom-filter';

export class WhitelistPolicy {

  isInWhitelist() {
    throw new Error('not implemented');
  }

  shouldProxyAddress(hostname) {
    return this.isInWhitelist(getGeneralDomain(hostname));
  }
}

export class TrackerWhitelistPolicy extends WhitelistPolicy {

  constructor(qsWhitelist) {
    super();
    this.qsWhitelist = qsWhitelist;
  }

  isInWhitelist(generalDomain) {
    return this.qsWhitelist.isTrackerDomain(md5(generalDomain).substring(0, 16));
  }

}

/**
 * Policy which loads a whitelist from the set of popular domains.
 */
export class BloomFilterWhitelistPolicy extends WhitelistPolicy {
  constructor() {
    super();
    this.domainList = {
      test() {
        return false;
      }
    };
  }

  updateBloomFilter(whitelist) {
    this.domainList = new BloomFilter(whitelist.bkt, whitelist.k);
  }

  isInWhitelist(domain) {
    return this.domainList.test(domain);
  }
}

/**
 * Policy to blacklist any private IP addresses from the proxy
 */
export class PrivateIPBlacklistPolicy {

  shouldNotProxyAddress(addr) {
    return isPrivateIPAddress(addr);
  }
}

export class CompositePolicy {

  constructor() {
    this.whitelists = [];
    this.blacklists = [];
  }

  addWhitelistPolicy(whitelistPolicy) {
    this.whitelists.push(whitelistPolicy);
  }

  addBlacklistPolicy(blacklist) {
    this.blacklists.push(blacklist);
  }

  shouldProxyAddress(addr) {
    return !this.blacklists.some(bl => bl.shouldNotProxyAddress(addr)) &&
            this.whitelists.some(wl => wl.shouldProxyAddress(addr));
  }

}

/**
 * Heuristic policy which dynamically detects whether domains resolve to public or private
 * IP addresses. Future proxying decisions are made based on this status.
 */
export class PublicDomainOnlyPolicy {

  constructor() {
    this.overrideWhitelist = null;
    this.requiredWhitelist = null;
    this.verified = new Map();
  }

  /**
   * Set a policy which will override the heuristic. i.e. if whitelistPolicy returns true
   * for a domain, this policy will return true.
   * @param whitelistPolicy
   */
  setOverridePolicy(whitelistPolicy) {
    this.overrideWhitelist = whitelistPolicy;
  }

  /**
   * Set a policy which must be satisfied before this policy can accept a domain. i.e. if policy
   * returns false for a domain, this policy will also return false.
   * @param policy
   */
  setRequiredPolicy(policy) {
    this.requiredWhitelist = policy;
  }

  shouldProxyAddress(addr) {
    // ignore whitelist overrides all
    if (this.overrideWhitelist && this.overrideWhitelist.shouldProxyAddress(addr)) {
      return true;
    }
    if (this.requiredWhitelist && !this.requiredWhitelist.shouldProxyAddress(addr)) {
      return false;
    }
    const status = this.verified.get(addr);
    if (status === 'public') {
      return true;
    } else if (status === undefined) {
      this.verified.set(addr, 'lookup');
      asyncResolve(addr)
        .then(ip => this.verified.set(addr, isPrivateIPAddress(ip) ? 'private' : 'public'))
        .catch(() => this.verified.set(addr, 'fail'));
    }
    return false;
  }

}
