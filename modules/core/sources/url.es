/* eslint no-param-reassign: 'off' */
/* eslint camelcase: 'off'  */
/* eslint no-multi-spaces: 'off'  */

import {
  UrlRegExp,
  LocalUrlRegExp,
} from '../platform/url';
import {
  cleanMozillaActions,
} from './content/url';
import URL, { isKnownProtocol } from './fast-url-parser';
import {
  URLInfo,
} from './url-info';

export {
  urlStripProtocol,
  cleanMozillaActions,
  isCliqzAction
} from './content/url';
export { equals } from './url-info';

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

export function fixURL(url) {
  try {
    // detect if we have a url already
    /* eslint-disable no-new */
    new URL(url);
    /* eslint-enable no-new */
  } catch (e) {
    // if not a url, we make up one
    return `http://${url}`;
  }

  return url;
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
          const uri = new URL(input);
          return !!(uri.host || uri.pathname !== '/') && uri.isValidHost();
        } catch (e) {
          return false;
        }
      }

      // If there were no slashes after colon, iț might be in fact an 'auth' or 'port' delimiter.
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
  return new URL(url);
}

export const tryDecodeURI = tryFn(decodeURI);
export const tryDecodeURIComponent = tryFn(decodeURIComponent);
export const tryEncodeURI = tryFn(encodeURI);
export const tryEncodeURIComponent = tryFn(encodeURIComponent);

export function stripTrailingSlash(str) {
  if (str.substr(-1) === '/') {
    return str.substr(0, str.length - 1);
  }
  return str;
}

/**
 * Thinking about using this function? Use URLInfo instead!
 * @param _originalUrl
 */
export function getDetailsFromUrl(_originalUrl) {
  const [action, originalUrl] = cleanMozillaActions(_originalUrl.trim());
  // exclude protocol
  const url = URLInfo.get(originalUrl) || URLInfo.get(`://${originalUrl}`);
  // remove trailing `.` from hostname - https://github.com/cliqz/navigation-extension/pull/6768
  url.hostname = url.hostname.replace(/\.$/, '');
  const cleanHost = url.cleanHost;
  const extra = url.pathname + url.search;
  const friendly_url = url.friendlyUrl;

  let domainDetails;
  if (url.hostIsIp) {
    domainDetails = {
      name: 'IP',
      domain: '',
      host: url.hostname,
      subdomains: [],
      tld: '',
    };
  } else if (!url.hostname) {
    domainDetails = {
      name: url.pathname,
      domain: '',
      host: '',
      subdomains: [],
      tld: '',
    };
  } else if (!url.isValidHost()) {
    domainDetails = {
      name: url.hostname,
      domain: url.hostname,
      host: url.hostname,
      subdomains: [],
      tld: '',
    };
  } else {
    domainDetails = {
      name: url.generalDomainMinusTLD,
      domain: url.generalDomain,
      host: url.domain,
      subdomains: url.domainInfo.subdomain ? url.domainInfo.subdomain.split('.') : [],
      tld: url.domainInfo.publicSuffix,
    };
  }

  const urlDetails = {
    action,
    originalUrl,
    scheme: url.protocol === ':' ? '' : url.protocol,
    path: url.pathname,
    query: url.search ? url.search.substring(1) : '',
    fragment: url.hash ? url.hash.substring(1) : '',
    extra,
    cleanHost,
    ssl: url.protocol === 'https:',
    port: url.port,
    friendly_url,
    ...domainDetails
  };
  // special cases
  if (urlDetails.domain === 'localhost') {
    urlDetails.name = urlDetails.domain;
    urlDetails.host = urlDetails.domain;
    urlDetails.domain = '';
    urlDetails.subdomains = [];
    urlDetails.tld = '';
  }

  return urlDetails;
}

export function getSearchEngineUrl(engine, query) {
  return engine.getSubmissionForQuery(query);
}

export function getVisitUrl(url) {
  return url;
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

function* flipTrailingSlash(urlObj, enabled) {
  if (enabled) {
    yield urlObj;
    if (urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    } else {
      urlObj.pathname = `${urlObj.pathname}/`;
    }
  }
  yield urlObj;
}

function* filpWWW(urlObj, enabled) {
  if (enabled) {
    yield urlObj;
    if (urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = urlObj.hostname.slice(4);
    } else {
      urlObj.hostname = `www.${urlObj.hostname}`;
    }
  }
  yield urlObj;
}

export function getUrlVariations(url, {
  protocol = true,
  www = true,
  trailingSlash = true,
} = {}) {
  let protocols = protocol ? ['http:', 'https:'] : [];
  const u = new URL(url);
  const urlSet = new Set([url]);

  if (!protocols.includes(u.protocol)) {
    protocols = [u.protocol];
  }

  protocols.forEach((proto) => {
    u.protocol = proto;
    /* eslint-disable no-unused-vars, no-shadow */
    for (const _ of filpWWW(u, www)) {
      for (const _ of flipTrailingSlash(u, trailingSlash)) {
        urlSet.add(u.stringify());
      }
    }
    /* eslint-enable */
  });

  return Array.from(urlSet);
}

export function isPrivateIP(ip) {
  // Need to check for ipv6.
  if (ip.indexOf(':') !== -1) {
    // ipv6
    if (ip === '::1') {
      return true;
    }
    const ipParts = ip.split(':');
    return ipParts[0].startsWith('fd')
      || ipParts.every((d, i) => {
        if (i === ipParts.length - 1) {
          // last group of address
          return d === '1';
        }
        return d === '0' || !d;
      });
  }
  const ipParts = ip.split('.').map(d => parseInt(d, 10));
  return ipParts[0] === 10
      || (ipParts[0] === 192 && ipParts[1] === 168)
      || (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] < 32)
      || ipParts[0] === 127
      || ipParts[0] === 0;
}
