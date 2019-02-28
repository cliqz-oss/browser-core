const KNOWN_PROTOCOLS = new Set(['http', 'https', 'ftp', 'file', 'about', 'mailto', 'chrome', 'moz-extension', 'chrome-extension', 'view-source', 'data']);

export function isKnownProtocol(protocol) {
  return KNOWN_PROTOCOLS.has(protocol.replace(/:$/, '').toLowerCase());
}

export function fixURL(url) {
  return url;
}

export default function equal(url1, url2) {
  return url1 === url2;
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
const LDH = `${LD}-_`; // technically underscore cannot be the part of hostname

export const UrlRegExp = /^(([a-z\d]([a-z\d-]*[a-z\d])?)\.)+[a-z]{2,}(:\d+)?$/i;

export const LocalUrlRegExp = new RegExp([
  `(^[${LD}][${LDH}]{0,61}[${LD}])`, // mandatory ascii hostname
  '(:\\d{1,5})$', // mandatory port
].join(''), 'i');
