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
