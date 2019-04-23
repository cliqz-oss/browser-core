import { Services, Components } from './globals';

export { LocalUrlRegExp, UrlRegExp } from '../platform-webextension/url';

const KNOWN_PROTOCOLS = new Set(['http', 'https', 'ftp', 'file', 'about', 'mailto', 'chrome', 'moz-extension', 'resource', 'dat', 'view-source', 'data']);
let ExternalProtocolService = null;

export function isKnownProtocol(protocol) {
  if (!ExternalProtocolService) {
    try {
      ExternalProtocolService = Components
        .classes['@mozilla.org/uriloader/external-protocol-service;1']
        .getService(Ci.nsIExternalProtocolService);
    } catch (e) {
      ExternalProtocolService = {
        getProtocolHandlerInfo() {
          return { possibleApplicationHandlers: [] };
        }
      };
    }
  }
  return KNOWN_PROTOCOLS.has(protocol.replace(/:$/, '').toLowerCase())
    || !!ExternalProtocolService
      .getProtocolHandlerInfo(protocol)
      .possibleApplicationHandlers.length;
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
    // Services.io.newURI().path changed in Fx 57 and returns undefined
    // in case there is no path. It was returning '/' in Fx56 and bellow
    return this.pathname || '/';
  }

  get isKnownProtocol() {
    return isKnownProtocol(this.protocol);
  }
}

export function fixURL(url) {
  let fixedURL = url;
  let redirectedToSearch = false;
  /* eslint-disable no-bitwise */
  const fixupFlags = Services.uriFixup.FIXUP_FLAG_NONE
    | Services.uriFixup.FIXUP_FLAG_FIX_SCHEME_TYPOS;
  /* eslint-enable no-bitwise */

  try {
    const platformURLFixup = Services.uriFixup.getFixupURIInfo(url, fixupFlags);
    redirectedToSearch = platformURLFixup.keywordAsSent !== '';
    fixedURL = platformURLFixup.fixedURI.spec;
  } catch (e) {
    // uriFixup can fail if URI is malformed or could not be fixed
  }

  if (redirectedToSearch && url.indexOf('://') === -1) {
    // Platform fixup converted URL to search request and there was no protocol in initial URL.
    // Try to fix it again with protocol.
    const sndTryURL = `://${fixedURL}`;
    const sndTryFixedURL = fixURL(sndTryURL);
    if (sndTryURL !== sndTryFixedURL) {
      fixedURL = sndTryFixedURL;
    }
  }

  return fixedURL;
}

export default function equal(url1, url2) {
  let uri1;
  let uri2;

  try {
    uri1 = Services.io.newURI(url1, 'UTF-8', null);
    uri2 = Services.io.newURI(url2, 'UTF-8', null);
  } catch (e) {
    return false;
  }

  return uri1.equals(uri2);
}
