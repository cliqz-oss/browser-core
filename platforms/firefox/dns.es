import { Components } from './globals';

export default function (hostname) {
  const dnsService = Components.classes['@mozilla.org/network/dns-service;1']
    .createInstance(Components.interfaces.nsIDNSService);

  return new Promise((resolve, reject) => {
    dnsService.asyncResolve(hostname, 0, {
      onLookupComplete(request, record, status) {
        if (!Components.isSuccessCode(status)) {
          reject();
        } else {
          const address = record.getNextAddrAsString();
          resolve(address);
        }
      }
    });
  });
}
