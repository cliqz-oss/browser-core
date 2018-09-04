const KNOWN_PROTOCOLS = ['http', 'https', 'ftp', 'file', 'about', 'mailto', 'chrome', 'moz-extension'];

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
    return KNOWN_PROTOCOLS.includes(this.protocol.slice(0, -1).toLowerCase());
  }
}
