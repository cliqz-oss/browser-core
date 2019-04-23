/* eslint no-param-reassign: 'off' */

import md5 from '../../core/helpers/md5';
import { dURIC } from '../../core/url-info';
import console from '../../core/console';

import { isMostlyNumeric } from '../hash';
import TokenDomain from '../token-domain';
import BlockLog from '../block-log';

function decodeToken(token) {
  let decodedToken = dURIC(token);
  let doubleDecoded = dURIC(decodedToken);
  while (decodedToken !== doubleDecoded) {
    decodedToken = doubleDecoded;
    doubleDecoded = dURIC(decodedToken);
  }
  return decodedToken;
}

/**
 * This class checks url components for UIDs and exposes any 'badTokens' found.
 *
 * @class TokenChecker
 * @namespace antitracking.steps
 */
export default class TokenChecker {
  constructor(qsWhitelist, privateValues, hashProb, config, telemetry, db) {
    this.qsWhitelist = qsWhitelist;
    this.config = config;
    this.debug = false;
    this.privateValues = privateValues;
    this.hashProb = hashProb;
    this.tokenDomain = new TokenDomain(config, db);
    this.blockLog = new BlockLog(telemetry, config);
  }

  init() {
    return Promise.all([this.tokenDomain.init(), this.blockLog.init()]);
  }

  unload() {
    this.tokenDomain.unload();
    this.blockLog.unload();
  }

  /**
   * Checks for uids in the request url and adds them to the pipeline state `badTokens`
   * attribute
   * @param  {Object} state Pipeline state object
   * @return {Boolean} true
   */
  findBadTokens(state) {
    const stats = {};
    state.isTracker = this.qsWhitelist.shouldCheckDomainTokens(state.urlParts.generalDomainHash);
    state.badTokens = this.checkTokens(state.urlParts, state.tabUrl,
      stats, state.tabUrlParts, state.isTracker, state.isPrivate);
    // set stats
    if (state.incrementStat) {
      Object.keys(stats).forEach((key) => {
        if (stats[key] > 0) {
          state.incrementStat(`token.has_${key}`);
          state.incrementStat(`token.${key}`, stats[key]);
        }
      });
      if (state.badTokens.length > 0) {
        state.incrementStat('bad_qs');
        state.incrementStat('bad_tokens', state.badTokens.length);
      }
    }
    return true;
  }

  /**
   * Check all tokens of the url for uids.
   *
   * A token is a uid one of the following apply:
   *  - it matches the user's cookie for this page
   *  - it matches a private value from JS (from this.privateValues)
   *  - it is not on the global safe value list, and its key is not in local nor global
   *  safe key lists
   *
   * It must also meet that condition that the same value has been seen on multiple first
   * party domains (this.config.tokenDomainCountThreshold).
   *
   * @param  {Object} urlParts        Parts of the request url, as parsed by parseURL
   * @param  {String} tabUrl          The first party url for this request
     A map of cookie values in the first party page - keys are values
   * @param  {Object} stats            An object to write stats to
   * @param  {Object} tabUrlParts Parts of the source url, as parsed by parseURL
   * @param  {Boolean} tracker         True if the request host is a tracker
     Array of values which we think are uids and should be removed.
   * @return {Array}
   */
  checkTokens(urlParts, tabUrl, stats, tabUrlParts, tracker, isPrivate) {
    // This check is only done for trackers
    if (!tracker) {
      return [];
    }

    // if there are no query parameters, there is nothing to check
    const keyTokens = urlParts.extractKeyValues().params;
    if (keyTokens.length === 0) {
      return [];
    }

    const trackerDomain = urlParts.generalDomainHash;
    const sourceDomain = tabUrlParts.generalDomainHash;
    const badTokens = [];

    // check for each kv in the url
    const tokenStatus = keyTokens.map((kv) => {
      const key = kv[0];
      const tok = kv[1];

      // ignore short values
      if (tok.length < this.config.shortTokenLength) {
        return 'short';
      }

      // if the value is in the main url, ignore
      if (tabUrl.indexOf(tok) > -1) {
        return 'sourceUrl';
      }

      // make different possible encodings of the token
      const decodedToken = decodeToken(tok);

      // if we didn't already match a cookie or private value, do these steps
      if (this.qsWhitelist.isSafeKey(trackerDomain, md5(key))) {
        return 'safekey';
      }

      if (this.qsWhitelist.isSafeToken(trackerDomain, md5(tok))) {
        return 'whitelisted';
      }

      // check for short non-hashes
      if (decodedToken.length < 12 && !isMostlyNumeric(decodedToken)
        && !this.hashProb.isHash(decodedToken)) {
        return 'short_no_hash';
      }

      const tokenType = 'qs';

      // count thresholds for token values
      if (!isPrivate) {
        // increment that this token has been seen on this site
        this.tokenDomain.addTokenOnFirstParty(md5(tok), sourceDomain);
      }
      // check if the threshold for cross-domain tokens has been reached
      if (!this.tokenDomain.isTokenDomainThresholdReached(md5(tok))) {
        return `${tokenType}_newToken`;
      }

      // push to block log and bad tokens list
      this.blockLog.add(tabUrlParts.generalDomain, urlParts.hostname, key, tok, tokenType);
      badTokens.push(tok);
      return `${tokenType}_countThreshold`;
    });

    if (this.debug) {
      // debug message: labeled key values
      const tokenReport = keyTokens
        .map((kv, i) => Object.assign(kv, { class: tokenStatus[i] }));
      console.log('tokens', urlParts.hostname, tokenReport);
    }

    tokenStatus.forEach((s) => {
      if (!stats[s]) {
        stats[s] = 0;
      }
      stats[s] += 1;
    });

    return badTokens;
  }
}
