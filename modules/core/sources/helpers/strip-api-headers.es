/* eslint-disable import/prefer-default-export */

// Ends with .ghostery.net or .ghostery.com or .cliqz.com
const regexpMatcher = /(?:[.]ghostery[.](?:net|com)|[.]cliqz[.]com)$/;

// Do not remove headers for these
const whitelist = new Set([
  'accountapi.ghostery.com',
  'consumerapi.ghostery.com',
  'accountapi.ghostery.net',
  'consumerapi.ghostery.net',
]);

export function isSafeToRemoveHeaders(hostname) {
  return regexpMatcher.test(hostname) && !whitelist.has(hostname);
}
