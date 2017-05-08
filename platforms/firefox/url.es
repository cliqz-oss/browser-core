import { Services } from './globals';
import console from '../core/console';

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
    console.log(`"${url1}" is not URL`, e);
    return false;
  }

  try {
    uri2 = Services.io.newURI(url2, 'UTF-8', null);
  } catch (e) {
    console.log(`"${url2}" is not URL`, e);
    return false;
  }

  return uri1.equals(uri2);
}
