
export { LocalUrlRegExp, UrlRegExp } from '../platform-webextension/url';

export function fixURL(url) {
  return url;
}

export default function equal(url1, url2) {
  return url1 === url2;
}
