import { Components } from '../globals';


export default class {
  constructor(CliqzHumanWeb) {
    this.CliqzHumanWeb = CliqzHumanWeb;
  }

  getDNS(hostname) {
    const dnsService = Components.classes['@mozilla.org/network/dns-service;1']
      .createInstance(Components.interfaces.nsIDNSService);

    return new Promise((resolve, reject) => {
      dnsService.asyncResolve(hostname, 0, {
        onLookupComplete(request, record, status) {
          if (!Components.isSuccessCode(status)) {
            reject();
          } else if (record) {
            const address = record.getNextAddrAsString();
            resolve(address);
          } else {
            reject();
          }
        },
      }, null);
    });
  }
}
