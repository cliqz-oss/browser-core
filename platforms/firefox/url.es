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

export default function equal(url1, url2) {
  let uri1;
  let uri2;

  try {
    uri1 = Services.io.newURI(url1, 'UTF-8', null);
  } catch (e) {
    return false;
  }

  try {
    uri2 = Services.io.newURI(url2, 'UTF-8', null);
  } catch (e) {
    return false;
  }

  return uri1.equals(uri2);
}
