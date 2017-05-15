const dnsService = Components.classes['@mozilla.org/network/dns-service;1']
  .createInstance(Components.interfaces.nsIDNSService);


export function asyncResolve(hostname) {
  return new Promise((resolve, reject) => {
    dnsService.asyncResolve(hostname, 0, {
      onLookupComplete(request, record, status) {
        if (!Components.isSuccessCode(status)) {
          reject(status);
          return;
        }
        resolve(record.getNextAddrAsString());
      }
    }, null);
  });
}


export function isPrivateIPAddress(ip) {
  try {
    const digits = ip.split('.').map(Number);
    const isv4 = digits.length === 4;
    const privSubnet = () => (digits[0] === 10 ||
      (digits[0] === 172 && digits[1] >= 16 && digits[1] < 32) ||
      (digits[0] === 192 && digits[1] === 168) ||
      digits[0] === 127);
    if (isv4 && privSubnet()) {
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}
