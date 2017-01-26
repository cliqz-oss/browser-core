
const Ci = Components.interfaces;

export let XMLHttpRequest = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'];

export function setPrivateFlags(request) {
  request.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS | Ci.nsIRequest.LOAD_BYPASS_CACHE | Ci.nsIRequest.INHIBIT_PERSISTENT_CACHING;
}

export function setBackgroundRequest(request) {
  req.mozBackgroundRequest = true;
}
