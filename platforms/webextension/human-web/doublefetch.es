import { equals as urlEquals } from '../../core/url';
import { setTimeout } from '../../core/timers';

// There needs to proper implementation, to avoid cases like:
// 1. Downloading streams.
// 2. Origin in web-extension.
export function getRequest(url) {
  const promise = new Promise((resolve, reject) => {
    const request = fetch(url, {
      credentials: 'omit',
      cache: 'no-cache',
    });
    const timeout = new Promise((_resolve, _reject) =>
      setTimeout(_reject, 10000, 'timeout'));

    return Promise.race([timeout, request]).then((response) => {
      if (response.status !== 200 && response.status !== 0 /* local files */) {
        reject(new Error(`status not valid: ${response.status}`));
      }

      if (!urlEquals(response.url, url)
        && !urlEquals(decodeURI(decodeURI(response.url)), decodeURI(decodeURI(url)))) {
        // there has been a redirect, we cannot guarantee that cookies were
        // not sent, therefore fail and consider as private
        reject(new Error(`DANGER: ${url} != ${response.url}`));
      }

      response.text().then((text) => {
        resolve(text);
      });
    }).catch((errorMessage) => {
      reject(errorMessage);
    });
  });
  return promise;
}

export default getRequest;
