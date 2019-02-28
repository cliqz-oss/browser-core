/* eslint no-param-reassign: 'off' */
/* eslint camelcase: 'off'  */
/* eslint no-multi-spaces: 'off'  */

import platformEquals, {
  URI,
  isKnownProtocol,
  UrlRegExp,
  LocalUrlRegExp,
} from '../platform/url';
import { getPublicSuffix } from './tlds';
import MapCache from './helpers/fixed-size-cache';
import {
  equals as urlEqual,
  cleanMozillaActions,
} from './content/url';
import { isBootstrap } from './platform';

export {
  urlStripProtocol,
  cleanMozillaActions,
  isCliqzAction
} from './content/url';
export { fixURL } from '../platform/url';

function tryFn(fn) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      return args[0];
    }
  };
}

const ipv4Part = '0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])'; // numbers 0 - 255
export const ipv4Regex = new RegExp(`^${ipv4Part}\\.${ipv4Part}\\.${ipv4Part}\\.${ipv4Part}([:]([0-9])+)?$`); // port number
export const ipv6Regex = new RegExp('^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$');
export const schemeRE = /^(\S+?):(\/\/)?(.*)$/i;

export function isIpv4Address(host) {
  return ipv4Regex.test(host);
}

export function isIpv6Address(host) {
  return ipv6Regex.test(host);
}

export function isIpAddress(host) {
  return isIpv4Address(host) || isIpv6Address(host);
}

/**
 * This function performs a loose check against given input string in order to decide
 * whether it LOOKS LIKE a URL or not. It relies on a number of heuristics and cannot be
 * 100% correct.
 *
 * Typical use case for this function would be testing if user-typed value in the URL bar
 * is a URL (and we should navigate to that address) or just a search query (and we should
 * lead them to search).
 *
 * It DOES NOT run strict URL checks or tests URL's validity, DO NOT USE IT FOR THESE PURPOSES.
 * @param {String} input
 * @returns {Boolean}
 */
export function isUrl(_input) {
  const input = _input.trim();
  if (!input) {
    return false;
  }

  // General heuristics are:
  // 1. If the input string can be successfuly parsed with a URL constructor
  //    and has a known protocol — it IS A URL.
  //    Examples: 'https://cliqz.com', 'mailto:info@cliqz.com', 'data:text/plain,hello'
  // 2. If the input string starts with a known protocol but cannot be parsed — it is NOT A URL.
  //    Examples: 'http://?q=0#wat', 'about:'
  // 3. If the input string is not valid URL (usually due to the lack of protocol) extract
  //    domain name and port out of it and run the following checks:
  //    a. If domain name is 'localhost' or IP-address IT IS A URL. Port is optional.
  //       Examples: 'localhost', '192.168.1.1', '[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443'
  //    b. If domain matches "höstnäme.tld" pattern IT IS A URL
  //       (höstnäme can contain Unicode symbols, port is optional).
  //       Examples: 'bild.de', 'www.nürnberg.de', 'cliqz.com:443'
  //    c. If domain matches "hostname:port" pattern IT IS A URL
  //       (hostname can only contain ASCII symbols).
  //       Examples: 'cliqznas:80', magrathea:8080'
  // 4. If none of the conditions above can be applied to the input string IT IS NOT A URL.

  function isUrlLike(host) {
    // TODO strict check port validity
    if (!host) {
      return false;
    }
    return host.toLowerCase() === 'localhost'
      || UrlRegExp.test(host)
      || LocalUrlRegExp.test(host)
      || isIpAddress(host);
  }

  // TODO extract regexp
  const [, proto, slashes, auth, host] = input.match(/^(?:([^:/\s@]*):(\/*))?([^@#?/]+@)?([^/?#]+).*$/) || [];

  if (proto) {
    if (host) {
      if (isKnownProtocol(proto)) {
        try {
          const uri = new URI(input);
          return !!(uri.host || uri.path !== '/');
        } catch (e) {
          return false;
        }
      }

      // If there were no slashes after colon, iț might be in fact an 'auth' or 'port' delimiter.
      // I.e. 'localhost:3000' or 'username:password@somewhere.com'
      if (!slashes) {
        const newhost = auth ? host : `${proto}:${host}`;
        return isUrlLike(newhost);
      }
    }

    // cases like 'http://?q=0' or 'unknown-protocol://whatever'
    return false;
  }

  return isUrlLike(host);
}


export function isLocalhost(host, isIPv4, isIPv6) {
  if (host === 'localhost') return true;
  if (isIPv4 && host.substr(0, 3) === '127') return true;
  if (isIPv6 && host === '::1') return true;

  return false;
}

// IP Validation
export function extractSimpleURI(url) {
  return new URI(url);
}

export const tryDecodeURI = tryFn(decodeURI);
export const tryDecodeURIComponent = tryFn(decodeURIComponent);
export const tryEncodeURI = tryFn(encodeURI);
export const tryEncodeURIComponent = tryFn(encodeURIComponent);

export function equals(url1, url2) {
  const equal = urlEqual(url1, url2);

  if (platformEquals(url1, url2)) {
    return true;
  }

  return equal;
}

export function stripTrailingSlash(str) {
  if (str.substr(-1) === '/') {
    return str.substr(0, str.length - 1);
  }
  return str;
}

function _getDetailsFromUrl(_originalUrl) {
  const [action, originalUrl] = cleanMozillaActions(_originalUrl);
  // exclude protocol
  let url = originalUrl;
  let scheme = '';
  let slashes = '';
  let name = '';
  let tld = '';
  let subdomains = [];
  let path = '';
  let query = '';
  let fragment = '';

  // remove scheme
  const schemeMatch = schemeRE.exec(url);
  if (schemeMatch) {
    scheme = schemeMatch[1];
    slashes = schemeMatch[2] || '';
    url = schemeMatch[3];
  }

  const ssl = scheme === 'https';

  // separate hostname from path, etc. Could be separated from rest by /, ? or #
  let host = url.split(/[/#?]/)[0].toLowerCase();
  path = url.replace(host, '');
  // Remove `single` dot (if any) from the end of the host, after obtaining correct path
  host = host.replace(/\.$/, '');

  // separate username:password@ from host
  const userpassHost = host.split('@');
  if (userpassHost.length > 1) {
    host = userpassHost[1];
  }

  // Parse Port number
  let port = '';

  let isIPv4 = isIpv4Address(host);
  let isIPv6 = isIpv6Address(host);

  const indexOfColon = host.indexOf(':');
  if ((!isIPv6 || isIPv4) && indexOfColon >= 0) {
    port = host.substr(indexOfColon + 1);
    host = host.substr(0, indexOfColon);
  } else if (isIPv6) {
    // If an IPv6 address has a port number,
    // it will be right after a closing bracket ] : format [ip_v6]:port
    const endOfIP = host.indexOf(']:');
    if (endOfIP >= 0) {
      port = host.split(']:')[1];
      host = host.split(']:')[0].replace('[', '').replace(']', '');
    }
  }

  // extract query and fragment from url
  query = '';
  const queryIdx = path.indexOf('?');
  if (queryIdx !== -1) {
    query = path.substr(queryIdx + 1);
  }

  fragment = '';
  const fragmentIdx = path.indexOf('#');
  if (fragmentIdx !== -1) {
    fragment = path.substr(fragmentIdx + 1);
  }

  // remove query and fragment from path
  path = path.replace(`?${query}`, '');
  path = path.replace(`#${fragment}`, '');
  query = query.replace(`#${fragment}`, '');

  // extra - all path, query and fragment
  let extra = path;
  if (query) {
    extra += `?${query}`;
  }
  if (fragment) {
    extra += `#${fragment}`;
  }

  isIPv4 = isIpv4Address(host);
  isIPv6 = isIpv6Address(host);
  const localhost = isLocalhost(host, isIPv4, isIPv6);

  // find parts of hostname
  if (!isIPv4 && !isIPv6 && !localhost) {
    try {
      let hostWithoutTld = host;
      tld = getPublicSuffix(host);

      if (tld) {
        hostWithoutTld = host.slice(0, -(tld.length + 1)); // +1 for the '.'
      }

      // Get subdomains
      subdomains = hostWithoutTld.split('.');
      // Get the domain name w/o subdomains and w/o TLD
      name = subdomains.pop();

      // remove www if exists
      // TODO: I don't think this is the right place to do this.
      //       Disabled for now, but check there are no issues.
      // host = host.indexOf('www.') == 0 ? host.slice(4) : host;
    } catch (e) {
      name = '';
      host = '';
    }
  } else {
    name = localhost ? 'localhost' : 'IP';
  }

  // remove www from beginning, we need cleanHost in the friendly url
  let cleanHost = host;
  if (host.toLowerCase().indexOf('www.') === 0) {
    cleanHost = host.slice(4);
  }

  let friendly_url = cleanHost + extra;
  if (scheme && scheme !== 'http' && scheme !== 'https') {
    friendly_url = `${scheme}:${slashes}${friendly_url}`;
  }
  // remove trailing slash from the end
  friendly_url = stripTrailingSlash(friendly_url);

  // Handle case where we have only tld for example http://cliqznas
  if (cleanHost === tld) {
    name = tld;
  }

  const urlDetails = {
    action,
    originalUrl,
    scheme: scheme ? `${scheme}:` : '',
    name,
    domain: tld ? `${name}.${tld}` : '',
    tld,
    subdomains,
    path,
    query,
    fragment,
    extra,
    host,
    cleanHost,
    ssl,
    port,
    friendly_url
  };

  return urlDetails;
}

const urlDetailsCache = new MapCache(_getDetailsFromUrl, 50);

export function getDetailsFromUrl(url) {
  return urlDetailsCache.get(url);
}

export function getSearchEngineUrl(engine, query, rawQuery) {
  if (!isBootstrap) {
    return engine.getSubmissionForQuery(query);
  }

  return `moz-action:searchengine,${JSON.stringify({
    engineName: engine.name,
    input: encodeURIComponent(query),
    searchQuery: encodeURIComponent(rawQuery),
    alias: engine.alias,
  })}`;
}

export function getVisitUrl(url) {
  if (!isBootstrap) {
    return url;
  }

  return `moz-action:visiturl,${JSON.stringify({
    url: encodeURIComponent(url)
  })}`;
}

export function cleanUrlProtocol(url, cleanWWW) {
  if (!url) {
    return '';
  }

  // removes protocol if it's http(s). See CLIQZIUM-218.
  const urlLowered = url.toLowerCase();
  if (urlLowered.startsWith('http://')) {
    url = url.slice(7);
  }
  if (urlLowered.startsWith('https://')) {
    url = url.slice(8);
  }

  // removes the www.
  if (cleanWWW && url.toLowerCase().startsWith('www.')) {
    url = url.slice(4);
  }

  return url;
}

// Remove clutter (http, www) from urls
export function generalizeUrl(url, skipCorrection) {
  if (!url) {
    return '';
  }
  let val = url.toLowerCase();
  const cleanParts = cleanUrlProtocol(val, false).split('/');
  const host = cleanParts[0];
  let pathLength = 0;
  const SYMBOLS = /,|\./g;
  if (!skipCorrection) {
    if (cleanParts.length > 1) {
      pathLength = (`/${cleanParts.slice(1).join('/')}`).length;
    }
    if (host.indexOf('www') === 0 && host.length > 4) {
      // only fix symbols in host
      if (SYMBOLS.test(host[3]) && host[4] !== ' ') {
      // replace only issues in the host name, not ever in the path
        val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.')
        + (pathLength ? val.substr(-pathLength) : '');
      }
    }
  }
  url = cleanUrlProtocol(val, true);
  return url[url.length - 1] === '/' ? url.slice(0, -1) : url;
}

function flipTrailingSlash(urlObj) {
  if (urlObj.pathname.endsWith('/')) {
    urlObj.pathname = urlObj.pathname.slice(0, -1);
  } else {
    urlObj.pathname = `${urlObj.pathname}/`;
  }
}

function filpWWW(urlObj) {
  if (urlObj.hostname.startsWith('www.')) {
    urlObj.hostname = urlObj.hostname.slice(4);
  } else {
    urlObj.hostname = `www.${urlObj.hostname}`;
  }
}

export function getUrlVariations(url) {
  let protocols = ['http:', 'https:'];
  const u = new URL(url);
  const urlSet = new Set();

  if (!protocols.includes(u.protocol)) {
    protocols = [u.protocol];
  }

  protocols.forEach((protocol) => {
    u.protocol = protocol;
    urlSet.add(u.toString());
    filpWWW(u);
    urlSet.add(u.toString());
    flipTrailingSlash(u);
    urlSet.add(u.toString());
  });

  return Array.from(urlSet);
}
