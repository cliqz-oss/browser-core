import TLDs from '../core/tlds-legacy';
import { tokenize } from '../core/pattern-matching';

// Create blacklist
const BLACKLIST = Object.create(null);
function blacklist(str) {
  const tokens = tokenize(str);

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

export default function (str) {
  return new Uint32Array(tokenize(str).filter(t => BLACKLIST[t] === undefined));
}
