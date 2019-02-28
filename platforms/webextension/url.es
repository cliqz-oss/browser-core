const KNOWN_PROTOCOLS = new Set(['http', 'https', 'ftp', 'file', 'about', 'mailto', 'chrome', 'moz-extension', 'chrome-extension', 'view-source', 'data']);

export function isKnownProtocol(protocol) {
  return KNOWN_PROTOCOLS.has(protocol.replace(/:$/, '').toLowerCase());
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

export default function equal(url1, url2) {
  try {
    return new URL(url1).href === new URL(url2).href;
  } catch (e) {
    return false;
  }
}

export class URI extends URL {
  get cleanHost() {
    let cleanHost = this.host;
    if (this.host.toLowerCase().indexOf('www.') === 0) {
      cleanHost = this.host.slice(4);
    }
    return cleanHost;
  }

  get path() {
    return this.pathname || '/';
  }

  get isKnownProtocol() {
    return isKnownProtocol(this.protocol);
  }
}

const LD = 'a-z0-9';
const ULD = `${LD}\\u{00c0}-\\u{ffff}`;
const LDH = `${LD}-_`; // technically underscore cannot be the part of hostname
const ULDH = `${ULD}-_`; // but it is being used too often to ignore it

export const UrlRegExp = new RegExp([
  `^(?:[${ULDH}]{1,63}\\.)*`, // optional subdomains
  `((?:[${ULD}][${ULDH}]{0,61}[${ULD}])|`,
  `(?:[${ULD}]))\\.`, // mandatory hostname
  `([${ULD}]{2,63})`, // mandatory TLD
  '(?:(?::(\\d{1,5}))|\\.)?$', // optional port or dot
].join(''), 'iu');

export const LocalUrlRegExp = new RegExp([
  `(^[${LD}][${LDH}]{0,61}[${LD}])`, // mandatory ascii hostname
  '(:\\d{1,5})$', // mandatory port
].join(''), 'i');
