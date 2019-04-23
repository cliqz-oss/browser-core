import md5 from '../../core/helpers/md5';
import pacemaker from '../../core/services/pacemaker';
import { URLInfo } from '../../core/url-info';
import { sameGeneralDomain, getGeneralDomain } from '../../core/tlds';

import { cleanTimestampCache } from '../utils';

export default class CookieContext {
  constructor(config, pageMeta, qsWhitelist) {
    this.config = config;
    this.pageMeta = pageMeta;
    this.qsWhitelist = qsWhitelist;
    this.visitCache = {};
    this.contextFromEvent = null;
    this.timeAfterLink = 5 * 1000;
    this.timeCleaningCache = 180 * 1000;
    this.timeActive = 20 * 1000;
    this.trustedThirdParties = new Map();
    // how long to keep trust entries which have not been triggered
    this.UNUSED_TRUST_TIMEOUT = 120000; // 2 minutes
    // how long to keep trust entries which have been used
    this.USED_TRUST_TIMEOUT = 900000; // 15 minutes
  }

  init() {
    this._pmclean = pacemaker.register(this.cleanCookieCache.bind(this), 2 * 60 * 1000);
  }

  unload() {
    pacemaker.deregister(this._pmclean);
  }

  cleanCookieCache(currTime) {
    // visit cache
    cleanTimestampCache(this.visitCache, this.timeCleaningCache, currTime);
    // trusted domain pairs
    const now = Date.now();
    this.trustedThirdParties.forEach((counter, key) => {
      const timeoutAt = counter.ts + (
        counter.c > 0
          ? this.USED_TRUST_TIMEOUT
          : this.UNUSED_TRUST_TIMEOUT
      );
      if (now > timeoutAt) {
        this.trustedThirdParties.delete(key);
      }
    });
  }

  _addTrustLink(fromFirstParty, toThirdParty) {
    if (sameGeneralDomain(fromFirstParty, toThirdParty)) {
      return;
    }
    // don't trust trackers
    if (this.qsWhitelist.isTrackerDomain(md5(getGeneralDomain(toThirdParty)).substring(0, 16))) {
      return;
    }
    const key = `${fromFirstParty}:${toThirdParty}`;
    if (!this.trustedThirdParties.has(key)) {
      this.trustedThirdParties.set(key, { c: 0 });
    }
    this.trustedThirdParties.get(key).ts = Date.now();
  }

  assignCookieTrust(state) {
    if (state.isMainFrame && state.getReferrer()) {
      const referrer = URLInfo.get(state.getReferrer());
      if (!referrer) {
        return true;
      }
      const trustedHost = state.urlParts.hostname;
      const trustedOn = referrer.hostname;

      // this domain is now trusted by the referrer
      this._addTrustLink(trustedOn, trustedHost);

      // check redirect chain for this page to see if we should back-propagate the trust chain
      if (this.pageMeta._active[state.tabId]) {
        this.pageMeta._active[state.tabId].redirects.forEach((domain) => {
          this._addTrustLink(domain, trustedHost);
        });
      }
    }
    return true;
  }

  checkCookieTrust(state) {
    const stage = state.statusCode !== undefined ? 'set_cookie' : 'cookie';
    const sourceHost = state.tabUrlParts.hostname;
    const requestHost = state.urlParts.hostname;
    const key = `${sourceHost}:${requestHost}`;
    if (this.config.cookieTrustReferers && this.trustedThirdParties.has(key)) {
      const trustCounter = this.trustedThirdParties.get(key);
      trustCounter.c += 1;
      trustCounter.ts = Date.now();

      state.incrementStat(`${stage}_allow_trust`);
      return false;
    }
    return true;
  }

  checkVisitCache(state) {
    // check if the response has been received yet
    const stage = state.statusCode !== undefined ? 'set_cookie' : 'cookie';
    const tabId = state.tabId;
    const diff = Date.now() - (this.visitCache[`${tabId}:${state.hostGD}`] || 0);
    if (diff < this.timeActive && this.visitCache[`${tabId}:${state.sourceGD}`]) {
      state.incrementStat(`${stage}_allow_visitcache`);
      return false;
    }
    return true;
  }

  checkContextFromEvent(state) {
    if (this.contextFromEvent) {
      const stage = state.statusCode !== undefined ? 'set_cookie' : 'cookie';
      const time = Date.now();
      const url = state.url;
      const tabId = state.tabId;
      const urlParts = state.urlParts;
      const sourceGD = state.tabUrlParts.generalDomain;
      const hostGD = state.urlParts.generalDomain;

      const diff = time - (this.contextFromEvent.ts || 0);
      if (diff < this.timeAfterLink) {
        if (hostGD === this.contextFromEvent.cGD && sourceGD === this.contextFromEvent.pageGD) {
          this.visitCache[`${tabId}:${hostGD}`] = time;
          state.incrementStat(`${stage}_allow_userinit_same_context_gd`);
          return false;
        }
        const pu = url.split(/[?&;]/)[0];
        if (this.contextFromEvent.html.indexOf(pu) !== -1) {
          // the url is in pu
          if (urlParts && urlParts.hostname && urlParts.hostname !== '') {
            this.visitCache[`${tabId}:${hostGD}`] = time;
            state.incrementStat(`${stage}_allow_userinit_same_gd_link`);
            return false;
          }
        }
        // last try, guess the possible domain from script src;
        if (!this.contextFromEvent.cGD && this.contextFromEvent.possibleCGD.has(hostGD)) {
          this.visitCache[`${tabId}:${hostGD}`] = time;
          state.incrementStat(`${stage}_allow_userinit_same_script_gd`);
          return false;
        }
      }
    }
    return true;
  }

  extractPossilbeContextGD(links) {
    return new Set(links.map(link => URLInfo.get(link).generalDomain));
  }

  setContextFromEvent(ev, contextHTML, herf, sender) {
    let cGD = null;
    let pageGD = null;
    const html = contextHTML || '';

    try {
      pageGD = URLInfo.get(sender.tab.url).generalDomain;
      cGD = URLInfo.get(ev.target.baseURI).generalDomain;
    } catch (ee) {
      // empty
    }
    if (!pageGD || cGD === pageGD) {
      return;
    }
    // Try to guess the possible domain from scripts src
    const possibleCGD = this.extractPossilbeContextGD(ev.target.linksSrc);
    this.contextFromEvent = {
      html,
      ts: Date.now(),
      cGD,
      pageGD,
      possibleCGD
    };
  }
}
