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
];
const regexpMatcher = new RegExp(matchesByHostnameRegExp.map(x => `(?:${x})`).join('|'));

// visible for tests only
export function isSafeToRemoveHeaders(hostname) {
  return exactMatcher.has(hostname) || regexpMatcher.test(hostname);
}

const httpHeadersToRemove = [
  'accept-language',
  'origin',
  'user-agent',
];

/**
 * Information in optional HTTP headers like the user-agent could be
 * used to link requests on the server side. This hook allows to
 * mark APIs that are known to work without these headers.
 *
 * Note: Works in WebExtensions, but it is known to fail on Bootstrap,
 * as requests from the extension itself will not be modified, there.
 * Antitracking, which also uses the API, is not affected as it operates
 * on requests made by the page itself. For that, the API still works.
 */
export default function installStripApiHeadersHandler(addHandler) {
  addHandler('onBeforeSendHeaders', {
    name: 'global.stripApiHeaders',
    spec: 'blocking',
    fn: (request, response) => {
      // remove headers only for XMLHttpRequest/fetch requests from the extension
      const xmlhttprequestType = 11;
      if (request.tabId === -1 && request.typeInt === xmlhttprequestType &&
          isSafeToRemoveHeaders(request.urlParts.hostname)) {
        httpHeadersToRemove.forEach(header => response.modifyHeader(header, ''));
      }
    },
  });
}
