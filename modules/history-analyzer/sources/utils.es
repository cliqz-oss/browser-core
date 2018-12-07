import TLDs from '../core/tlds-legacy';
import { tryDecodeURI } from '../core/url';
import PatternMatching from '../platform/lib/adblocker';

// Create blacklist
const BLACKLIST = Object.create(null);
function blacklist(str) {
  const tokens = PatternMatching.tokenize(str);

  if (tokens.length > 0) {
    BLACKLIST[tokens[0]] = str;
  }
}

blacklist('www');
blacklist('http');
blacklist('https');

Object.keys(TLDs).forEach((tld) => {
  blacklist(tld);
});

function normalize(str) {
  return tryDecodeURI(str).toLowerCase();
}

export default function (str) {
  return new Uint32Array(
    PatternMatching.tokenize(normalize(str)).filter(t => BLACKLIST[t] === undefined),
  );
}

// Time constants
export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
