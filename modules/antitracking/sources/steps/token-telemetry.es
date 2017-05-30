import md5 from '../md5';
import * as datetime from '../time';
import * as persist from '../persistent-state';
import { splitTelemetryData } from '../utils';
import pacemaker from '../pacemaker';

/**
 * Add padding characters to the left of the given string.
 *
 * @param {string} str  - original string.
 * @param {string} char - char used for padding the string.
 * @param {number} size - desired size of the resulting string (after padding)
**/
function leftpad(str, char, size) {
  // This function only makes sens if `char` is a character.
  if (char.length != 1) {
    throw new Error("`char` argument must only contain one character");
  }

  if (str.length >= size) {
    return str;
  }
  else {
    return (char.repeat(size - str.length) + str);
  }
}

/**
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
**/
function anonymizeTrackerTokens(trackerData) {
  let index = 1
  // Anonymize the given tracker data
  const anonymizedTrackerData = {};

  for (let originalKey in trackerData) {
    const newRandomKey = leftpad(index.toString().substr(0, 16), '0', 16);
    index += 1;
    anonymizedTrackerData[newRandomKey] = trackerData[originalKey];
  }

  return anonymizedTrackerData;
}


export default class {

  constructor(telemetry) {
    this.telemetry = telemetry;
    this.tokens = {};
    this._tokens = new persist.AutoPersistentObject("tokens", (v) => this.tokens = v, 60000);
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
    if(state.requestContext.isChannelPrivate()) return true;

    const keyTokens = state.urlParts.getKeyValuesMD5();
    if (keyTokens.length > 0) {
      const domain = md5(state.urlParts.hostname).substr(0, 16);
      const firstParty = md5(state.sourceUrlParts.hostname).substr(0, 16);
      this._saveKeyTokens(domain, keyTokens, firstParty);
    }
    return true;
  }

  _saveKeyTokens(domain, keyTokens, firstParty) {
    // anything here should already be hash
    if (this.tokens[domain] == null) this.tokens[domain] = {lastSent: datetime.getTime()};
    if (this.tokens[domain][firstParty] == null) this.tokens[domain][firstParty] = {'c': 0, 'kv': {}};

    this.tokens[domain][firstParty]['c'] =  (this.tokens[domain][firstParty]['c'] || 0) + 1;
    for (var kv of keyTokens) {
        var tok = kv.v,
            k = kv.k;
        if (this.tokens[domain][firstParty]['kv'][k] == null) this.tokens[domain][firstParty]['kv'][k] = {};
        if (this.tokens[domain][firstParty]['kv'][k][tok] == null) {
            this.tokens[domain][firstParty]['kv'][k][tok] = {
                c: 0,
                k_len: kv.k_len,
                v_len: kv.v_len
            };
        }
        this.tokens[domain][firstParty]['kv'][k][tok].c += 1;
    }
    this._tokens.setDirty();
  }

  sendTokens() {
    // send tokens every 5 minutes
    let data = {},
        hour = datetime.getTime(),
        limit = Math.floor(Object.keys(this.tokens).length / 12) || 1;

    // sort tracker keys by lastSent, i.e. send oldest data first
    let sortedTrackers = Object.keys(this.tokens).sort((a, b) => {
        return parseInt(this.tokens[a].lastSent || 0) - parseInt(this.tokens[b].lastSent || 0)
    });

    for (let i in sortedTrackers) {
        let tracker = sortedTrackers[i];

        if (limit > 0 && Object.keys(data).length > limit) {
            break;
        }

        let tokenData = this.tokens[tracker];
        if (!(tokenData.lastSent) || tokenData.lastSent < hour) {
            delete(tokenData.lastSent);
            data[tracker] = anonymizeTrackerTokens(tokenData);
            delete(this.tokens[tracker]);
        }
    }

    if (Object.keys(data).length > 0) {
        splitTelemetryData(data, 20000).map((d) => {
            const msg = {
                'type': this.telemetry.msgType,
                'action': 'attrack.tokens',
                'payload': d
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
