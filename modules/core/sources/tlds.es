import { isIpAddress } from './url';
import tlds from '../platform/tldjs';

// Re-export symbols from `tldjs`
const getDomain = tlds.getDomain.bind(tlds);
const getPublicSuffix = tlds.getPublicSuffix.bind(tlds);
const getSubdomain = tlds.getSubdomain.bind(tlds);
const tldExists = tlds.tldExists.bind(tlds);
const TLDs = tlds.rules;

//
// Efficient implementation of get general domain with built-in caching.
//

const invalidHostnameCharacters = /[^a-zA-Z0-9.-]/;


/**
 * Extrach the domain from an url, ignoring the schema and parameters.
 */
function _extractDomain(url) {
  let domain = url;

  // We need to check that the index is <= because this protocol could appear
  // as a value of a parameter in the URL.
  const indexOfProtocol = url.indexOf('://');
  if (indexOfProtocol !== -1 && indexOfProtocol <= 6) {
    domain = url.substring(indexOfProtocol + 3);
  }

  const indexOfSlash = domain.indexOf('/');
  if (indexOfSlash !== -1) {
    domain = domain.substring(0, indexOfSlash);
  }

  if (domain.startsWith('www.')) {
    domain = domain.substring(4);
  }

  return domain;
}


function _getGeneralDomainFromHostname(hostname) {
  const gd = getDomain(hostname);

  // Some hostname will not play well with the `getDomain` function if they
  // also constitute a valid public suffix (eg: googleapis.com)
  if (gd === null && tldExists(hostname)) {
    return hostname;
  }

  return gd;
}


/**
 * Efficient accelerating structure used to store domains. This is used as a
 * cache for the getGeneralDomain function. If an hostname ends with a valid
 * general domain from the suffix tree, then we consider it a match and use the
 * hit as a general domain for this hostname.
 */
class SuffixTreeDomainCache {
  constructor() {
    this.cache = Object.create(null);
  }

  /**
   * Try to get a value from the cache for this url, if none is present, then
   * compute the result and store it in the cache for next time.
   */
  get(url) {
    const hostname = _extractDomain(url);

    // Check if we already have this general domain in the cache
    // This is super cheap, so we do it first.
    const cacheResult = this.lookup(hostname);
    if (cacheResult) {
      return cacheResult;
    }

    // If it's a valid IP address, we return it.
    if (isIpAddress(hostname)) {
      return hostname;
    }

    // Check for forbidden characters in the hostname
    if (hostname.search(invalidHostnameCharacters) !== -1) {
      return null;
    }

    // If not cached and the hostname is valid, then extract the general domain
    const gd = _getGeneralDomainFromHostname(hostname);

    if (gd !== null) {
      this.set(gd);
    }

    return gd;
  }

  /**
   * Try to lookup a valid suffix for the given `hostname`.
   * eg: a valid result for 'foo.bar.com' could be 'bar.com'
   */
  lookup(hostname) {
    const parts = hostname.split('.').reverse();
    let cache = this.cache;
    let index = 0;

    while (cache.$ === undefined) {
      const value = parts[index];
      const c = cache[value];
      if (c !== undefined) {
        index += 1;
        cache = c;
      } else {
        return null;
      }
    }

    return cache.$;
  }

  /**
   * Store a hostname in the suffix tree.
   */
  set(generalDomain) {
    const parts = generalDomain.split('.').reverse();
    let cache = this.cache;

    // Insert intermediary elements
    parts.forEach((part) => {
      let c = cache[part];
      if (c === undefined) {
        c = Object.create(null);
        cache[part] = c;
      }

      cache = c;
    });

    // Last element of the `parts
    cache.$ = generalDomain;
  }
}

// Use an optimized suffix-tree cache populated with general domains and used
// everytime we want to extract the general domain from a hostname.
export const CACHE = new SuffixTreeDomainCache();
function getGeneralDomain(url) {
  return CACHE.get(url);
}


export default {
  getGeneralDomain,

  // tldjs
  getPublicSuffix,
  getDomain,
  getSubdomain,
  tldExists,
  TLDs,
};
