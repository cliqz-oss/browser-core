
import tlds from '../core/tlds-legacy';
import { fastStartsWith } from './utils';


// ---------------------------------------------------------------------------
// Specialize network filters (for more efficient matching)
// ---------------------------------------------------------------------------


// pattern
function checkPatternPlainFilter(filter, { url }) {
  return url.indexOf(filter.getFilter()) !== -1;
}


// pattern|
function checkPatternRightAnchorFilter(filter, { url }) {
  return url.endsWith(filter.getFilter());
}


// |pattern
function checkPatternLeftAnchorFilter(filter, { url }) {
  return fastStartsWith(url, filter.getFilter());
}


// |pattern|
function checkPatternLeftRightAnchorFilter(filter, { url }) {
  return url === filter.getFilter();
}


// pattern*^
function checkPatternRegexFilter(filter, { url }) {
  return filter.getRegex().test(url);
}


function isAnchoredByHostname(filterHostname, hostname) {
  const matchIndex = hostname.indexOf(filterHostname);
  // Either start at beginning of hostname or be preceded by a '.'
  return (matchIndex === 0 || (matchIndex > 0 && hostname[matchIndex - 1] === '.'));
}


// ||pattern*^
function checkPatternHostnameAnchorRegexFilter(filter, { url, hostname }) {
  if (isAnchoredByHostname(filter.getHostname(), hostname)) {
    return checkPatternRegexFilter(filter, { url });
  }

  return false;
}


// ||pattern|
function checkPatternHostnameRightAnchorFilter(filter, { url, hostname }) {
  if (isAnchoredByHostname(filter.getHostname(), hostname)) {
    // Since this is not a regex, the filter pattern must follow the hostname
    // with nothing in between. So we extract the part of the URL following
    // after hostname and will perform the matching on it.
    const urlAfterHostname = url.substring(
      url.indexOf(filter.getHostname()) + filter.getHostname().length
    );

    // Since it must follow immediatly after the hostname and be a suffix of
    // the URL, we conclude that filter must be equal to the part of the
    // url following the hostname.
    return filter.getFilter() === urlAfterHostname;
  }

  return false;
}


// ||pattern
function checkPatternHostnameAnchorFilter(filter, { url, hostname }) {
  if (isAnchoredByHostname(filter.getHostname(), hostname)) {
    // Since this is not a regex, the filter pattern must follow the hostname
    // with nothing in between. So we extract the part of the URL following
    // after hostname and will perform the matching on it.
    const urlAfterHostname = url.substring(
      url.indexOf(filter.getHostname()) + filter.getHostname().length
    );

    // Otherwise, it should only be a prefix of the URL.
    return fastStartsWith(urlAfterHostname, filter.getFilter());
  }

  return false;
}


/**
 * Specialize a network filter depending on its type. It allows for more
 * efficient matching function.
 */
function checkPattern(filter, request) {
  if (filter.isHostnameAnchor()) {
    if (filter.isRegex()) {
      return checkPatternHostnameAnchorRegexFilter(filter, request);
    } else if (filter.isRightAnchor()) {
      return checkPatternHostnameRightAnchorFilter(filter, request);
    }
    return checkPatternHostnameAnchorFilter(filter, request);
  } else if (filter.isRegex()) {
    return checkPatternRegexFilter(filter, request);
  } else if (filter.isLeftAnchor() && filter.isRightAnchor()) {
    return checkPatternLeftRightAnchorFilter(filter, request);
  } else if (filter.isLeftAnchor()) {
    return checkPatternLeftAnchorFilter(filter, request);
  } else if (filter.isRightAnchor()) {
    return checkPatternRightAnchorFilter(filter, request);
  }

  return checkPatternPlainFilter(filter, request);
}


function checkOptions(filter, request) {
  // This is really cheap and should be done first
  if (!filter.isCptAllowed(request.cpt)) {
    return false;
  }

  // Source
  const sHost = request.sourceHostname;
  const sHostGD = request.sourceGD;

  // Url endpoint
  const hostGD = request.hostGD;
  const isFirstParty = (sHostGD === hostGD);

  // Check option $third-party
  // source domain and requested domain must be different
  if (!filter.firstParty() && isFirstParty) {
    return false;
  }

  // $~third-party
  // source domain and requested domain must be the same
  if (!filter.thirdParty() && !isFirstParty) {
    return false;
  }

  // URL must be among these domains to match
  if (filter.hasOptDomains()) {
    const optDomains = filter.getOptDomains();
    if (optDomains.size > 0 &&
        !(optDomains.has(sHostGD) ||
          optDomains.has(sHost))) {
      return false;
    }
  }

  // URL must not be among these domains to match
  if (filter.hasOptNotDomains()) {
    const optNotDomains = filter.getOptNotDomains();
    if (optNotDomains.size > 0 &&
        (optNotDomains.has(sHostGD) ||
         optNotDomains.has(sHost))) {
      return false;
    }
  }

  return true;
}


export function matchNetworkFilter(filter, request) {
  return checkOptions(filter, request) && checkPattern(filter, request);
}


/* Checks that hostnamePattern matches at the end of the hostname.
 * Partial matches are allowed, but hostname should be a valid
 * subdomain of hostnamePattern.
 */
function checkHostnamesPartialMatch(hostname, hostnamePattern) {
  let pattern = hostnamePattern;
  if (fastStartsWith(hostnamePattern, '~')) {
    pattern = pattern.substr(1);
  }

  if (hostname.endsWith(pattern)) {
    const patternIndex = hostname.length - pattern.length;
    if (patternIndex === 0 || (hostname[patternIndex - 1] === '.')) {
      return true;
    }
  }

  return false;
}


/* Checks if `hostname` matches `hostnamePattern`, which can appear as
 * a domain selector in a cosmetic filter: hostnamePattern##selector
 *
 * It takes care of the concept of entities introduced by uBlock: google.*
 * https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#entity-based-cosmetic-filters
 */
function matchHostname(hostname, hostnamePattern) {
  if (hostnamePattern.endsWith('.*')) {
    // Match entity:
    const entity = hostnamePattern.slice(0, -2);

    // Ignore TLDs suffix
    // TODO - we should use getPublicSuffix for that, but it's currently very
    // slow because of the implementation of tld.js
    const parts = hostname.split('.');
    let i = parts.length - 1;
    for (; i >= 0; i -= 1) {
      const value = tlds[parts[i]];
      if (!(value === 'cc' || value === 'na')) {
        break;
      }
    }

    if (i >= 0) {
      // Check if we have a match
      return checkHostnamesPartialMatch(
        parts.slice(0, i + 1).join('.'),
        entity);
    }

    return false;
  }

  return checkHostnamesPartialMatch(hostname, hostnamePattern);
}


export function matchCosmeticFilter(filter, hostname) {
  // Check hostnames
  if (filter.hasHostnames() && hostname) {
    const hostnames = filter.getHostnames();
    for (let i = 0; i < hostnames.length; i += 1) {
      if (matchHostname(hostname, hostnames[i])) {
        return { hostname: hostnames[i] };
      }
    }

    // No hostname match
    return null;
  }

  return { hostname: '' };
}
