import md5 from 'antitracking/md5';
import { getGeneralDomain } from 'antitracking/domain';
import * as datetime from 'antitracking/time';
import { HashProb, isMostlyNumeric } from 'antitracking/hash';
import { dURIC } from 'antitracking/url';
import CliqzUtils from 'core/utils';

const STAT_KEYS = ['cookie', 'private', 'cookie_b64', 'private_b64', 'safekey', 'whitelisted',
  'cookie_newToken', 'cookie_countThreshold', 'private_newToken', 'private_countThreshold',
  'short_no_hash', 'cookie_b64_newToken', 'cookie_b64_countThreshold', 'private_b64_newToken',
  'private_b64_countThreshold', 'qs_newToken', 'qs_countThreshold'];

export default class {

  constructor(qsWhitelist, blockLog, privateValues, hashProb, config) {
    this.qsWhitelist = qsWhitelist;
    this.blockLog = blockLog;
    this.config = config;
    this.debug = false;
    this.privateValues = privateValues;
    this.hashProb = hashProb;
  }

  init() {

  }

  findBadTokens(state) {
    const stats = {};
    state.badTokens = this.checkTokens(state.urlParts, state.sourceUrl, state.cookieValues, stats, state.sourceUrlParts);
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

  checkTokens(url_parts, source_url, cookievalue, stats, source_url_parts) {
    const self = this;
    // bad tokens will still be returned in the same format
    var s = getGeneralDomain(url_parts.hostname);
    s = md5(s).substr(0, 16);
    // If it's a rare 3rd party, we don't do the rest
    if (!this.qsWhitelist.isTrackerDomain(s)) return [];

    var sourceD = md5(source_url_parts.hostname).substr(0, 16);
    var today = datetime.getTime().substr(0, 8);

    if (url_parts['query'].length == 0 && url_parts['parameters'].length == 0) return [];
    var tok;

    var badTokens = [];

    // stats keys
    STAT_KEYS.forEach(function(k) {stats[k] = 0;});

    var _countCheck = function(tok) {
        // for token length < 12 and may be not a hash, we let it pass
        if (tok.length < 12) {
          if(isMostlyNumeric(tok)) {
            stats.short_numeric++;
          } else if (self.hashProb.isHash(tok)) {
            stats.short_hash++;
          } else {
            return 0;
          }
        }
        // update tokenDomain
        tok = md5(tok);
        self.blockLog.tokenDomain.addTokenOnFirstParty(tok, sourceD);
        return self.blockLog.tokenDomain.getNFirstPartiesForToken(tok);
    };

    var _incrStats = function(cc, prefix, tok, key, val) {
        if (cc == 0)
            stats['short_no_hash']++;
        else if (cc < self.config.tokenDomainCountThreshold)
            stats[prefix+'_newToken']++;
        else {
            _addBlockLog(s, key, val, prefix);
            badTokens.push(val);
            if (cc == self.config.tokenDomainCountThreshold)
                stats[prefix + '_countThreshold']++;
            stats[prefix]++;
            return true;
        }
        return false;
    };

    var _addBlockLog = (s, key, val, prefix) => {
        self.blockLog.blockLog.add(source_url, s, key, val, prefix);
    }

    var _checkTokens = function(key, val) {
        self.blockLog.incrementCheckedTokens();

        var tok = dURIC(val);
        while (tok != dURIC(tok)) {
            tok = dURIC(tok);
        }

        if (tok.length < self.config.shortTokenLength || source_url.indexOf(tok) > -1) return;

        // Bad values (cookies)
        for (var c in cookievalue) {
            if ((tok.indexOf(c) > -1 && c.length >= self.config.shortTokenLength) || c.indexOf(tok) > -1) {
                if (self.debug) CliqzUtils.log('same value as cookie ' + val, 'tokk');
                var cc = _countCheck(tok);
                if (c != tok) {
                    cc = Math.max(cc, _countCheck(c));
                }
                if (_incrStats(cc, 'cookie', tok, key, val))
                    return;
            }
        }

        // private value (from js function returns)
        for (var c in self.privateValues) {
            if ((tok.indexOf(c) > -1 && c.length >= self.config.shortTokenLength) || c.indexOf(tok) > -1) {
                if (self.debug) CliqzUtils.log('same private values ' + val, 'tokk');
                var cc = _countCheck(tok);
                if (c != tok) {
                    cc = Math.max(cc, _countCheck(c));
                }
                if (_incrStats(cc, 'private', tok, key, val))
                    return;
            }
        }
        var b64 = null;
        try {
            b64 = atob(tok);
        } catch(e) {
        }
        if (b64 != null) {
            for (var c in cookievalue) {
                if ((b64.indexOf(c) > -1 && c.length >= self.config.shortTokenLength) || c.indexOf(b64) > -1) {
                    if (self.debug) CliqzUtils.log('same value as cookie ' + b64, 'tokk-b64');
                    var cc = _countCheck(tok);
                    if (c != tok) {
                        cc = Math.max(cc, _countCheck(c));
                    }
                    if (_incrStats(cc, 'cookie_b64', tok, key, val))
                        return;
                }
            }
            for (var c in self.privateValues) {
                if (b64.indexOf(c) > -1 && c.length >= self.config.shortTokenLength) {
                    if (self.debug) CliqzUtils.log('same private values ' + b64, 'tokk-b64');
                    var cc = _countCheck(tok);
                    if (c != tok) {
                        cc = Math.max(cc, _countCheck(c));
                    }
                    if (_incrStats(cc, 'private_b64', tok, key, val))
                        return;
                }
            }
        }


        // Good keys.
        if (self.qsWhitelist.isSafeKey(s, md5(key))) {
            stats['safekey']++;
            return;
        }

        if (source_url.indexOf(tok) == -1) {
            if (!self.qsWhitelist.isSafeToken(s, md5(tok))) {
                var cc = _countCheck(tok);
                _incrStats(cc, 'qs', tok, key, val);
            } else
                stats['whitelisted']++;
        }
    };

    url_parts.getKeyValues().forEach(function (kv) {
      _checkTokens(kv.k, kv.v);
    });

    // update blockedToken
    this.blockLog.incrementBlockedTokens(badTokens.length);
    return badTokens;
  }
}
