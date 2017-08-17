import { Services } from './globals';

export function isURI(text) {
  try {
    Services.io.newURI(text, 'UTF-8', null);
    return true;
  } catch (e) {
    return false;
  }
}

export default function equal(url1, url2) {
  let uri1;
  let uri2;

  if (!url1 || !url2) {
    return false;
  }

  if (url1 === url2) {
    return true;
  }

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
