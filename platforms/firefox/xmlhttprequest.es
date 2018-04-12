/* eslint no-bitwise: 'off' */

import { Components } from './globals';

const Ci = Components.interfaces;

export const XMLHttpRequestFactory = () => {
  if (typeof XMLHttpRequest === 'undefined') {
    // imported by default in bootstrap scope but not present in
    // process scripts by default
    Components.utils.importGlobalProperties(['XMLHttpRequest']);
  }
  return XMLHttpRequest;
};

export function setPrivateFlags(request) {
  if (request.channel) {
    request.channel.loadFlags
      |= Ci.nsIRequest.LOAD_ANONYMOUS
      | Ci.nsIRequest.LOAD_BYPASS_CACHE
      | Ci.nsIRequest.INHIBIT_PERSISTENT_CACHING;
  }
}

export function setBackgroundRequest(request) {
  request.mozBackgroundRequest = true;
}
