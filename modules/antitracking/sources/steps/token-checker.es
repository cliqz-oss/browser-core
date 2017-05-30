import md5 from '../md5';
import { getGeneralDomain } from '../domain';
import * as datetime from '../time';
import { HashProb, isMostlyNumeric } from '../hash';
import { dURIC } from '../url';
import CliqzUtils from '../../core/utils';
import TokenDomain from '../token-domain';
import BlockLog from '../block-log';

const STAT_KEYS = ['cookie', 'private', 'cookie_b64', 'private_b64', 'safekey', 'whitelisted',
  'cookie_newToken', 'cookie_countThreshold', 'private_newToken', 'private_countThreshold',
  'short_no_hash', 'cookie_b64_newToken', 'cookie_b64_countThreshold', 'private_b64_newToken',
  'private_b64_countThreshold', 'qs_newToken', 'qs_countThreshold'];


function decodeToken(token) {
  let decodedToken = dURIC(token);
  let doubleDecoded = dURIC(decodedToken);
  while (decodedToken !== doubleDecoded) {
    decodedToken = doubleDecoded;
    doubleDecoded = dURIC(decodedToken);
  }
  return decodedToken
}

function b64Encode(token) {
  var b64 = null;
  try {
      b64 = atob(token);
  } catch(e) {
  }
  return b64;
}

/**
 * This class checks url components for UIDs and exposes any 'badTokens' found.
 *
 * @class TokenChecker
 * @namespace antitracking.steps
 */
export default class {

  constructor(qsWhitelist, privateValues, hashProb, config, telemetry) {
    this.qsWhitelist = qsWhitelist;
    this.config = config;
    this.debug = false;
    this.privateValues = privateValues;
    this.hashProb = hashProb;
    this.tokenDomain = new TokenDomain(config);
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
    state.isTracker = this.qsWhitelist.isTrackerDomain(state.urlParts.generalDomainHash);
    state.badTokens = this.checkTokens(state.urlParts, state.sourceUrl, state.cookieValues,
      stats, state.sourceUrlParts, state.isTracker);
    // set stats
    if (state.incrementStat) {
      Object.keys(stats).forEach(function(key) {
        if(stats[key] > 0) {
          state.incrementStat('token.has_'+ key);
          state.incrementStat('token.'+ key, stats[key]);
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
   * @param  {Object} url_parts        Parts of the request url, as parsed by parseURL
   * @param  {String} source_url       The first party url for this request
   * @param  {Object} cookievalue      A map of cookie values in the first party page - keys are values
   * @param  {Object} stats            An object to write stats to
   * @param  {Object} source_url_parts Parts of the source url, as parsed by parseURL
   * @param  {Boolean} tracker         True if the request host is a tracker
   * @return {Array}                   Array of values which we think are uids and should be removed.
   */
  checkTokens(url_parts, source_url, cookievalue, stats, source_url_parts, tracker) {
    // This check is only done for trackers
    if (!tracker) {
      return [];
    }

    // if there are no query parameters, there is nothing to check
    if (url_parts.query.length == 0 && url_parts.parameters.length == 0) {
      return [];
    }

    const trackerDomain = url_parts.generalDomainHash;
    const sourceDomain = source_url_parts.generalDomainHash
    var badTokens = [];

    const longCookies = Object.keys(cookievalue).filter((c) => c.length >= this.config.shortTokenLength)

    // check for each kv in the url
    const tokenStatus = url_parts.getKeyValues().map((kv) => {
      const key = kv.k;
      const tok = String(kv.v);

      // ignore short values
      if (tok.length < this.config.shortTokenLength) {
        return 'short';
      }

      // if the value is in the main url, ignore
      if (source_url.indexOf(tok) > -1) {
        return 'source_url';
      }

      // make different possible encodings of the token
      const decodedToken = decodeToken(tok);
      const tokenVariants = [tok, decodedToken, b64Encode(tok), b64Encode(decodedToken)].filter(t => t && t.length > 0)

      function tokenMatches(val) {
        // check if the value is in the cookie or the value is in the token
        return tokenVariants.some(t => t.indexOf(val) > -1 || val.indexOf(t) > -1);
      }

      // check for cookie or private values - presence of these override the global
      // safe key and token lists
      const cookieMatch = longCookies.some(tokenMatches);
      const privateMatch = Object.keys(this.privateValues).some(tokenMatches);
      const overrideGlobalLists = cookieMatch || privateMatch;

      if (!overrideGlobalLists && this.qsWhitelist.isSafeKey(trackerDomain, md5(key))) {
        return 'safekey';
      }

      if (!overrideGlobalLists && this.qsWhitelist.isSafeToken(trackerDomain, md5(tok))) {
        return 'whitelisted'
      }

      // check for short non-hashes
      if (decodedToken.length < 12 && !isMostlyNumeric(decodedToken)
        && !this.hashProb.isHash(decodedToken)) {
        return 'short_no_hash';
      }

      const tokenType = cookieMatch ? 'cookie' : (privateMatch ? 'private' : 'qs');

      // increment that this token has been seen on this site
      this.tokenDomain.addTokenOnFirstParty(md5(tok), sourceDomain);
      // check if the threshold for cross-domain tokens has been reached
      if (!this.tokenDomain.isTokenDomainThresholdReached(md5(tok))) {
        return `${tokenType}_newToken`;
      }

      // push to block log and bad tokens list
      this.blockLog.add(source_url_parts.generalDomain, url_parts.hostname, key, tok, tokenType);
      badTokens.push(tok);
      return `${tokenType}_countThreshold`;
    });

    if (this.debug) {
      // debug message: labeled key values
      const tokenReport = url_parts.getKeyValues().map((kv, i) => Object.assign(kv, {'class': tokenStatus[i]}));
      console.log('tokens', url_parts.hostname, tokenReport);
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
