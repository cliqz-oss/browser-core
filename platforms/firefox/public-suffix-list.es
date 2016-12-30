import console from 'core/console';

var eTLDService = Components.classes["@mozilla.org/network/effective-tld-service;1"]
                  .getService(Components.interfaces.nsIEffectiveTLDService);

export function getGeneralDomain(hostname) {
  try {
    return eTLDService.getBaseDomainFromHost(hostname);
  } catch(e) {
    if (e.result === Components.results.NS_ERROR_HOST_IS_IP_ADDRESS) {
      // hostname is an ip address (v4 or v6)
      return hostname;
    }
    // other exceptions mean that this hostname is not valid. Pass exception to caller
    throw e;
  }
}
