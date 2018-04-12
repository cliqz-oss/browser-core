/* eslint no-bitwise: 'off' */

import { equals as urlEquals } from '../../core/url';

export function getRequest(url) {
  const promise = new Promise((resolve, reject) => {
    let errorMessage = null;

    const req = new XMLHttpRequest();

    /*
    We need a try catch block here, because there are some URLs which throw malformed URI error,
    hence stalling the double fetch on the same row.
    Such URLs should not be there at the first place, but in-case they are, we set them as private.
    */

    try {
      req.open('GET', url, true);
    } catch (ee) {
      reject();
      return;
    }
    req.overrideMimeType('text/html');
    req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_ANONYMOUS;
    //  req.withCredentials = false;
    //  req.setRequestHeader("Authorization", "true");

    req.onload = () => {
      if (req.status !== 200 && req.status !== 0 /* local files */) {
        errorMessage = `status not valid: ${req.status}`;
        req.onerror();
      } else {
        // there has been a redirect, we cannot guarantee that cookies were
        // not sent, therefore fail and consider as private
        if (!urlEquals(req.responseURL, url) &&
            !urlEquals(decodeURI(decodeURI(req.responseURL)), decodeURI(decodeURI(url)))) {
          errorMessage = 'dangerous redirect';
          req.onerror();
          return;
        }
        resolve(req.responseText);
      }
    };

    req.onerror = () => {
      reject(errorMessage);
    };
    req.ontimeout = () => {
      errorMessage = 'timeout';
      req.onerror();
      reject(errorMessage);
    };

    req.timeout = 10000;
    req.send(null);
  });
  return promise;
}

export default getRequest;
