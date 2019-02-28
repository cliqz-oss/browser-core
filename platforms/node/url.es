import parser from 'fast-url-parser';

export { LocalUrlRegExp, UrlRegExp } from '../platform-webextension/url';

const KNOWN_PROTOCOLS = ['http', 'https', 'ftp', 'file', 'about', 'mailto', 'chrome', 'moz-extension', 'resource', 'dat'];

export class URI {
  constructor(url) {
    Object.assign(this, parser.parse(url));
  }

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

  get protocol() {
    return this._protocol;
  }

  get isKnownProtocol() {
    return KNOWN_PROTOCOLS.includes(this.protocol);
  }
}

export function fixURL(url) {
  return url;
}

export default function equal(url1, url2) {
  return url1 === url2;
}
