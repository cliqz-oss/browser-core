import { isURI } from '../platform/url';

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


export function isIpv4Address(host) {
  return ipv4_regex.test(host);
}


export function isIpv6Address(host) {
  return ipv6_regex.test(host);
}


export function isIpAddress(host) {
  return isIpv4Address(host) || isIpv6Address(host);
}


export { default as equals } from '../platform/url';
