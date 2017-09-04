import platformEquals, { isURI, URI } from '../platform/url';
import LRU from './LRU';
import tlds from './tlds';


const UrlRegExp = /^(([a-z\d]([a-z\d-]*[a-z\d])?)\.)+[a-z]{2,}(\:\d+)?$/i;

export function isUrl(input) {
  if (!input) {
    return false;
  }
  // TODO: handle ip addresses
  if (isURI(input)) {
    return true;
  } else {
    //step 1 remove eventual protocol
    const protocolPos = input.indexOf('://');
    if(protocolPos != -1 && protocolPos <= 6){
      input = input.slice(protocolPos+3)
    }
    //step2 remove path & everything after
    input = input.split('/')[0];
    //step3 run the regex
    return UrlRegExp.test(input);
  }
}


export function isLocalhost(host, isIPv4, isIPv6) {
  if (host == "localhost") return true;
  if (isIPv4 && host.substr(0,3) == "127") return true;
  if (isIPv6 && host == "::1") return true;

  return false;
}

/*
strip protocol from url
*/
export function urlStripProtocol(url) {
  let resultUrl = url;
  const toRemove = ['https://', 'http://',
    'www2.', 'www.',
    'mobile.', 'mobil.', 'm.'];
  toRemove.forEach(part => {
    if (resultUrl.toLowerCase().startsWith(part)) {
      resultUrl = resultUrl.substring(part.length);
    }
  });
  // remove trailing slash as well to have all urls in the same format
  if (resultUrl[resultUrl.length - 1] === '/') {
    resultUrl = resultUrl.slice(0, -1);
  }
  return resultUrl;
}


// IP Validation

const ipv4_part = "0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])"; // numbers 0 - 255
const ipv4_regex = new RegExp("^" + ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part + "([:]([0-9])+)?$"); // port number
const ipv6_regex = new RegExp("^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$");
const schemeRE = /^(\S+?):(\/\/)?(.*)$/i;


export function isIpv4Address(host) {
  return ipv4_regex.test(host);
}


export function isIpv6Address(host) {
  return ipv6_regex.test(host);
}


export function isIpAddress(host) {
  return isIpv4Address(host) || isIpv6Address(host);
}

export function extractSimpleURI(url) {
  return new URI(url);
}

export function equals(url1, url2) {
  if (!url1 || !url2) {
    return false;
  }

  if (url1 === url2) {
    return true;
  }

  if (decodeURI(url1) === decodeURI(url2)) {
    return true;
  }

  if (platformEquals(url1, url2)) {
    return true;
  }

  return false;
}


export function cleanMozillaActions(url = '') {
  if(url.indexOf("moz-action:") == 0) {
    var [, action, url] = url.match(/^moz-action:([^,]+),(.*)$/);
    try {
      // handle cases like: moz-action:visiturl,{"url": "..."}
      const mozActionUrl = JSON.parse(url).url;
      if (mozActionUrl) {
        url = decodeURIComponent(mozActionUrl);
      }
    } catch (e) {
    }
  }
  return [action, url];
}


export function stripTrailingSlash(str) {
  if(str.substr(-1) === '/') {
    return str.substr(0, str.length - 1);
  }
  return str;
}


const urlDetailsCache = new LRU(10000);

export function getDetailsFromUrl(originalUrl) {
  if (urlDetailsCache.has(originalUrl)) {
    return urlDetailsCache.get(originalUrl);
  }
  var [action, originalUrl] = cleanMozillaActions(originalUrl);
  // exclude protocol
  var url = originalUrl,
    scheme = '',
    slashes = '',
    name = '',
    tld = '',
    subdomains = [],
    path = '',
    query ='',
    fragment = '';

  // remove scheme
  const schemeMatch = schemeRE.exec(url);
  if (schemeMatch) {
    scheme = schemeMatch[1];
    slashes = schemeMatch[2] || '';
    url = schemeMatch[3];
  }
  const ssl = scheme == 'https';

  // separate hostname from path, etc. Could be separated from rest by /, ? or #
  var host = url.split(/[\/\#\?]/)[0].toLowerCase();
  var path = url.replace(host,'');

  // separate username:password@ from host
  var userpass_host = host.split('@');
  if(userpass_host.length > 1)
    host = userpass_host[1];

  // Parse Port number
  var port = "";

  var isIPv4 = isIpv4Address(host);
  var isIPv6 = isIpv6Address(host);

  var indexOfColon = host.indexOf(":");
  if ((!isIPv6 || isIPv4) && indexOfColon >= 0) {
    port = host.substr(indexOfColon+1);
    host = host.substr(0,indexOfColon);
  }
  else if (isIPv6) {
    // If an IPv6 address has a port number, it will be right after a closing bracket ] : format [ip_v6]:port
    var endOfIP = host.indexOf(']:');
    if (endOfIP >= 0) {
      port = host.split(']:')[1];
      host = host.split(']:')[0].replace('[','').replace(']','');
    }
  }

  // extract query and fragment from url
  var query = '';
  var query_idx = path.indexOf('?');
  if(query_idx != -1) {
    query = path.substr(query_idx+1);
  }

  var fragment = '';
  var fragment_idx = path.indexOf('#');
  if(fragment_idx != -1) {
    fragment = path.substr(fragment_idx+1);
  }

  // remove query and fragment from path
  path = path.replace('?' + query, '');
  path = path.replace('#' + fragment, '');
  query = query.replace('#' + fragment, '');

  // extra - all path, query and fragment
  var extra = path;
  if(query)
    extra += "?" + query;
  if(fragment)
    extra += "#" + fragment;

  isIPv4 = isIpv4Address(host);
  isIPv6 = isIpv6Address(host);
  var localhost = isLocalhost(host, isIPv4, isIPv6);

  // find parts of hostname
  if (!isIPv4 && !isIPv6 && !localhost) {
    try {
      let hostWithoutTld = host;
      tld = tlds.getPublicSuffix(host);

      if (tld) {
        hostWithoutTld = host.slice(0, -(tld.length + 1)); // +1 for the '.'
      }

      // Get subdomains
      subdomains = hostWithoutTld.split('.');
      // Get the domain name w/o subdomains and w/o TLD
      name = subdomains.pop();

      //remove www if exists
      // TODO: I don't think this is the right place to do this.
      //       Disabled for now, but check there are no issues.
      // host = host.indexOf('www.') == 0 ? host.slice(4) : host;
    } catch(e){
      name = "";
      host = "";
      //CliqzUtils.log('WARNING Failed for: ' + originalUrl, 'CliqzUtils.getDetailsFromUrl');
    }
  }
  else {
    name = localhost ? "localhost" : "IP";
  }

  // remove www from beginning, we need cleanHost in the friendly url
  var cleanHost = host;
  if(host.toLowerCase().indexOf('www.') == 0) {
    cleanHost = host.slice(4);
  }

  var friendly_url = cleanHost + extra;
  if (scheme && scheme != 'http' && scheme != 'https')
    friendly_url = scheme + ":" + slashes + friendly_url;
  //remove trailing slash from the end
  friendly_url = stripTrailingSlash(friendly_url);

  //Handle case where we have only tld for example http://cliqznas
  if(cleanHost === tld) {
    name = tld;
  }

  var urlDetails = {
    scheme: scheme ? scheme + ':' : '',
    name: name,
    domain: tld ? name + '.' + tld : '',
    tld: tld,
    subdomains: subdomains,
    path: path,
    query: query,
    fragment: fragment,
    extra: extra,
    host: host,
    cleanHost: cleanHost,
    ssl: ssl,
    port: port,
    friendly_url: friendly_url
  };
  urlDetailsCache.set(originalUrl, urlDetails);

  return urlDetails;
}
