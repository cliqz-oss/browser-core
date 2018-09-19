// Detects requests where the hostname must exactly
// match one of these entries:
const matchesByExactHostname = [
  // search:
  'api.cliqz.com',

  // human-web:
  'hpn-collector.cliqz.com', // hpnv1 collector
  'hpn-sign.cliqz.com', // hpnv1 signer
  'collector-hpn.cliqz.com', // hpnv2 collector
  'ghostery-sign.ghostery.com', // hpnv1 signer
  'ghostery-collector.ghostery.com', // hpnv1 signer

  // human-web, antitracking, antiphishing:
  'safe-browsing-quorum.cliqz.com',
  'safe-browsing-quorum.ghostery.com',
  'safe-browsing.cliqz.com',
  'safe-browsing.ghostery.com',
  'antiphishing.cliqz.com',

  // anolysis:
  'anolysis.privacy.cliqz.com',
  'anolysis.privacy.clyqz.com',

  // offers:
  'offers-api.cliqz.com',
  'offers-api.ghostery.com',
];
const exactMatcher = new Set(matchesByExactHostname);

// Fallback for hostnames that cannot be represented by exact matches:
const matchesByHostnameRegExp = [
  '^hpn-proxy-\\w+[.]proxy[.]cliqz[.]com$', // hpnv1 proxies (Cliqz)
  '^hpn-proxy-\\d+[.]ghostery[.]com$', // hpnv1 proxies (Ghostery)
  '[.]ghostery[.]net$', // all new Ghostery APIs (*.ghostery.net)
];
const regexpMatcher = new RegExp(matchesByHostnameRegExp.map(x => `(?:${x})`).join('|'));


/* eslint-disable import/prefer-default-export */
export function isSafeToRemoveHeaders(hostname) {
  return exactMatcher.has(hostname) || regexpMatcher.test(hostname);
}
