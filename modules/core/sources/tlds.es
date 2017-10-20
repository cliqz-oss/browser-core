import { isIpAddress } from './url';
import tldjs from '../platform/tldjs';
import TLDs from './tlds-legacy';


/**
 * Extrach the domain from an url, ignoring the schema and parameters.
 */
function extractHostname(url) {
  if (typeof url !== 'string') {
    return '';
  }

  let domain = url;

  // We need to check that the index is <= because this protocol could appear
  // as a value of a parameter in the URL.
  const indexOfProtocol = url.indexOf('://');
  if (indexOfProtocol !== -1 && indexOfProtocol <= 6) {
    domain = url.substr(indexOfProtocol + 3);
  }

  const indexOfSlash = domain.indexOf('/');
  if (indexOfSlash !== -1) {
    domain = domain.substr(0, indexOfSlash);
  }

  if (domain.startsWith('www.')) {
    domain = domain.substr(4);
  }

  if (domain.endsWith('.')) {
    domain = domain.substr(0, domain.length - 1);
  }

  return domain;
}


// Use our faster `extractHostname` implementation in tldjs
const tlds = tldjs.fromUserSettings({
  // Note: in the next version, tld.js should not require `validHost` as a
  // first argument.
  extractHostname: (validHosts, url) => extractHostname(url),
  validHosts: [
    'localhost',
  ],
});


function parse(url) {
  const parsed = tlds.parse(url);

  // TODO - ip addr handling could be integrated in tld.js library
  // Specific handling of IP addresses
  if (isIpAddress(parsed.hostname)) {
    parsed.domain = parsed.hostname;
  } else if (parsed.domain === null) {
    // Some hostname will not play well with the `getDomain` function if they
    // also constitute a valid public suffix (eg: googleapis.com)
    parsed.domain = parsed.suffix;
  }

  return parsed;
}


function getGeneralDomain(url) {
  return parse(url).domain;
}


function getPublicSuffix(url) {
  return parse(url).suffix;
}


export default {
  // Legacy - should be removed at some point
  TLDs,

  parse,
  getGeneralDomain,
  getPublicSuffix,
  extractHostname,
};
