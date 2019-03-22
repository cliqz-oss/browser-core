export { LocalUrlRegExp, UrlRegExp } from '../platform-webextension/url';
const KNOWN_PROTOCOLS = new Set(['http', 'https', 'ftp', 'file', 'about', 'mailto', 'chrome', 'data']);

export function isKnownProtocol(protocol) {
  return KNOWN_PROTOCOLS.has(protocol.replace(/:$/, '').toLowerCase());
}

export function fixURL(url) {
  return url;
}

export default function equal(url1, url2) {
  return url1 === url2;
}
