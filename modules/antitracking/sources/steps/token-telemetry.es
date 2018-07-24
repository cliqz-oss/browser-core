/* eslint no-restricted-syntax: 'off' */

import md5 from '../../core/helpers/md5';
import * as persist from '../../core/persistent-state';
import { splitTelemetryData, truncateDomain } from '../utils';
import pacemaker from '../../core/pacemaker';
import { TELEMETRY } from '../config';

/*
 * Add padding characters to the left of the given string.
 *
 * @param {string} str  - original string.
 * @param {string} char - char used for padding the string.
 * @param {number} size - desired size of the resulting string (after padding)
*/
function leftpad(str, char, size) {
  // This function only makes sens if `char` is a character.
  if (char.length !== 1) {
    throw new Error('"char" argument must only contain one character');
  }

  if (str.length >= size) {
    return str;
  }
  return (char.repeat(size - str.length) + str);
}

/*
 * Remove any trace of source domains, or hashes of source domains
 * from the data to be sent to the backend. This is made to ensure
 * there is no way to backtrack to user's history using data sent to
 * the backend.
 *
 * Replace all the keys of `trackerData` (which are 16-chars prefixes of
 * hash of the source domain) by unique random strings of size 16 (which is
 * expected by backend). We don't have to make them unique among all data,
 * it is enough to ensure unicity on a per-tracker basis.
 *
 * @param {Object} trackerData - associate source domains to key/value pairs.
*/
function anonymizeTrackerTokens(trackerData) {
  let index = 1;
  // Anonymize the given tracker data
  const anonymizedTrackerData = {};

  for (const originalKey in trackerData) {
    if (Object.prototype.hasOwnProperty.call(trackerData, originalKey)) {
      const newRandomKey = leftpad(index.toString().substr(0, 16), '0', 16);
      index += 1;
      anonymizedTrackerData[newRandomKey] = trackerData[originalKey];
    }
  }

  return anonymizedTrackerData;
}


export default class TokenTelemetry {
  constructor(telemetry, qsWhitelist, config) {
    this.telemetry = telemetry;
    this.qsWhitelist = qsWhitelist;
    this.config = config;
    this.tokens = {};
    this._tokens = new persist.AutoPersistentObject(
      'tokens',
      (v) => { this.tokens = v; },
      60000);
  }

  init() {
    this._pmsend = pacemaker.register(this.sendTokens.bind(this), 5 * 60 * 1000);
  }

  unload() {
    this._tokens.save();
    pacemaker.deregister(this._pmsend);
  }

  extractKeyTokens(state) {
    // ignore private requests
    if (state.isPrivate) return true;

    const keyTokens = state.urlParts.getKeyValuesMD5();
    if (keyTokens.length > 0) {
      const truncatedDomain = truncateDomain(state.urlParts.host, this.config.tpDomainDepth);
      const domain = md5(truncatedDomain).substr(0, 16);
      const firstParty = md5(state.sourceUrlParts.hostname).substr(0, 16);
      const generalDomain = md5(state.urlParts.generalDomain).substr(0, 16);
      this._saveKeyTokens(domain, keyTokens, firstParty, generalDomain);
    }
    return true;
  }

  _touchToken(key, firstParty) {
    if (!(key in this.tokens)) {
      this.tokens[key] = {
        lastSent: Date.now()
      };
    }
    if (!(firstParty in this.tokens[key])) {
      this.tokens[key][firstParty] = {
        c: 0,
        kv: {}
      };
    }
  }

  _saveKeyTokens(domain, keyTokens, firstParty, generalDomain) {
    // anything here should already be hash
    const dkSafe = domain;
    const dkUnsafe = `${domain}_unsafe`;
    const isTracker = this.qsWhitelist.isTrackerDomain(generalDomain);

    // telemetryMode 0: collect nothing, telemetryMode 1: collect only for tracker domains
    if (this.config.telemetryMode === TELEMETRY.DISABLED ||
       (this.config.telemetryMode === TELEMETRY.TRACKERS_ONLY && !isTracker)) {
      return;
    }

    keyTokens.forEach((kv) => {
      const tok = kv.v;
      const k = kv.k;
      // put token in safe bucket if: value is short, domain is not a tracker,
      // or key or value is whitelisted
      const safe = kv.v_len < this.config.shortTokenLength ||
                   !isTracker ||
                   this.qsWhitelist.isSafeKey(generalDomain, k) ||
                   this.qsWhitelist.isSafeToken(generalDomain, tok);
      const dk = safe ? dkSafe : dkUnsafe;
      this._touchToken(dk, firstParty);
      if (this.tokens[dk][firstParty].kv[k] == null) {
        this.tokens[dk][firstParty].kv[k] = {};
      }
      if (this.tokens[dk][firstParty].kv[k][tok] == null) {
        this.tokens[dk][firstParty].kv[k][tok] = {
          c: 0,
          k_len: kv.k_len,
          v_len: kv.v_len
        };
      }
      this.tokens[dk][firstParty].kv[k][tok].c += 1;
    });
    this._tokens.setDirty();
  }

  sendTokens() {
    // send a batch for safe tokens, and one for unsafe
    const domainKeyIsSafe = key => !key.endsWith('_unsafe');
    this._sendTokenBatch(domainKeyIsSafe);
    this._sendTokenBatch(key => !domainKeyIsSafe(key));
  }

  _sendTokenBatch(keyFilter) {
    const data = {};
    const domainKeys = Object.keys(this.tokens).filter(keyFilter);
    const limit = Math.floor(domainKeys.length / 12) || 1;

    // minimum time between sending events for the same key
    const cooldownInMs = 60 * 60 * 1000; // 1h
    const now = Date.now();

    // sort tracker keys by lastSent, i.e. send oldest data first
    const sortedTrackers = domainKeys.sort((a, b) =>
      parseInt(this.tokens[a].lastSent || 0, 10) - parseInt(this.tokens[b].lastSent || 0, 10)
    );

    for (const i in sortedTrackers) {
      if (Object.prototype.hasOwnProperty.call(sortedTrackers, i)) {
        const dk = sortedTrackers[i];
        const tokenData = this.tokens[dk];
        // remove the suffix (i.e. '_unsafe')
        const domain = dk.substring(0, 16);

        if (limit > 0 && Object.keys(data).length > limit) {
          break;
        }

        if (!(domain in data) &&
            (!(tokenData.lastSent) ||
             parseInt(tokenData.lastSent, 10) + cooldownInMs <= now)) {
          delete tokenData.lastSent;
          const dataPayload = anonymizeTrackerTokens(tokenData);
          delete this.tokens[dk];
          if (Object.keys(dataPayload).length > 0) {
            data[domain] = dataPayload;
          }
        }
      }
    }

    if (Object.keys(data).length > 0) {
      splitTelemetryData(data, 20000).forEach((d) => {
        const msg = {
          type: this.telemetry.msgType,
          action: 'attrack.tokens',
          payload: d
        };
        this.telemetry({
          message: msg,
          compress: true,
        });
      });
    }
    this._tokens.setDirty();
  }
}
