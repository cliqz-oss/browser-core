/* eslint no-param-reassign: 'off' */

import ResourceLoader from '../core/resource-loader';
import config from '../core/config';

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
      cron: 24 * 60 * 60 * 1000 // daily
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
