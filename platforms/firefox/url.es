import { Services } from './globals';

export function isURI(text) {
  try {
    Services.io.newURI(text, 'UTF-8', null);
    return true;
  } catch (e) {
    return false;
  }
}

export class URI {
  constructor(url) {
    this.uri = Services.io.newURI(url, 'UTF-8', null);
  }

  get cleanHost() {
    let cleanHost = this.uri.host;
    if (this.uri.host.toLowerCase().indexOf('www.') === 0) {
      cleanHost = this.uri.host.slice(4);
    }
    return cleanHost;
  }
  get path() {
    // Services.io.newURI().path changed in Fx 57 and returns undefined
    // in case there is no path. It was returning '/' in Fx56 and bellow
    return this.uri.path || '/';
  }
}

export function fixURL(url) {
  let fixedURL = url;
  let redirectedToSearch = false;
  /* eslint-disable no-bitwise */
  const fixupFlags =
    Services.uriFixup.FIXUP_FLAG_NONE |
    Services.uriFixup.FIXUP_FLAG_FIX_SCHEME_TYPOS;
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
    fixedURL = fixURL(`://${fixedURL}`);
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
