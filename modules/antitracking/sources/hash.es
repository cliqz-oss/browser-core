/* eslint no-param-reassign: 'off' */

import ResourceLoader from '../core/resource-loader';
import config from '../core/config';
import { isIpv4Address } from '../core/url';

export class HashProb {
  constructor() {
    this.probHashLogM = null;
    this.probHashThreshold = null;
    this.probHashChars = {};
    'abcdefghijklmnopqrstuvwxyz1234567890.- '.split('').forEach((e, idx) => {
      this.probHashChars[e] = idx;
    });

    this.probLoader = new ResourceLoader(['antitracking', 'prob.json'], {
      remoteURL: `${config.settings.CDN_BASEURL}/anti-tracking/prob.json`,
      cron: 7 * 24 * 60 * 60 * 1000, // weekly
    });
  }

  _update(data) {
    this.probHashLogM = data.logM;
    this.probHashThreshold = data.thresh;
  }

  init() {
    this.probLoader.onUpdate(this._update.bind(this));
    return this.probLoader.load().then(this._update.bind(this));
  }

  unload() {
    this.probLoader.stop();
  }

  isHashProb(str) {
    if (!this.probHashLogM || !this.probHashThreshold) {
      return 0;
    }
    let logProb = 0.0;
    let transC = 0;
    str = str.toLowerCase().replace(/[^a-z0-9.\- ]/g, '');
    for (let i = 0; i < str.length - 1; i += 1) {
      const pos1 = this.probHashChars[str[i]];
      const pos2 = this.probHashChars[str[i + 1]];

      logProb += this.probHashLogM[pos1][pos2];
      transC += 1;
    }
    if (transC > 0) {
      return Math.exp(logProb / transC);
    }
    return Math.exp(logProb);
  }

  isHash(str) {
    const p = this.isHashProb(str);
    return (p < this.probHashThreshold);
  }
}

const numberThreshold = 0.8;

export function isMostlyNumeric(str) {
  let numbers = 0;
  const length = str.length;
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if (code >= 48 && code < 58) {
      numbers += 1;
    }
  }
  return numbers / length > numberThreshold;
}

const BEGIN_DATE = (new Date(2010, 1, 1)).getTime();
const END_DATE = Date.now() + (1000 * 60 * 60 * 24 * 365 * 5);

export function isTimestamp(str) {
  const intVal = parseInt(str, 10);
  return !isNaN(intVal) && intVal > BEGIN_DATE && intVal < END_DATE;
}

/**
 * Check if this value should be considered as a potential identifier and subject to token checks
 * @param str
 */
export function shouldCheckToken(hashProb, minLength, str) {
  if (str.length < minLength) {
    return false;
  }
  // exclude IP addresses
  if (isIpv4Address(str)) {
    return false;
  }
  // numeric short (< 13 digits)
  if (str.length < 13 && isMostlyNumeric(str)) {
    return true;
  }
  // is a timestamp?
  if (str.length === 13 && isTimestamp(str)) {
    return false;
  }
  return hashProb.isHash(str);
}
