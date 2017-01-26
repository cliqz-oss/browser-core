import { utils } from 'core/cliqz';

const dnsService = Components.classes['@mozilla.org/network/dns-service;1']
  .createInstance(Components.interfaces.nsIDNSService);

const currentThread = Components.classes['@mozilla.org/thread-manager;1']
  .getService(Components.interfaces.nsIThreadManager).currentThread;

const LOOKUP_TIMEOUT = 250;

const dns = {
  // prevent entering `lookup` multiple times
  // (we are messing with the event loop below)
  isLocked: false,
  // status of async lookup operation
  isRunning: false,
  // lookup result
  isSuccess: true,

  lookup(hostName) {
    if (this.isLocked) return false;
    this.isLocked = true;

    const startTime = Date.now();
    let isTimeout = false;
    // assume success by default to not change FF default on timeout
    this.isSuccess = true;
    this.isRunning = true;

    dnsService.asyncResolve(hostName, 0, this.listener, currentThread);
    utils.setTimeout(() => (isTimeout = true), LOOKUP_TIMEOUT);

    while (this.isRunning && !isTimeout) {
      // http://mdn.beonex.com/en/Code_snippets/Threads.html
      currentThread.processNextEvent(true);
    }

    utils.telemetry({
      type: 'performance',
      action: 'dns_lookup',
      is_success: this.isSuccess,
      is_timeout: isTimeout,
      duration: Date.now() - startTime,
    });

    this.isLocked = false;
    return this.isSuccess;
  },
  listener: {
    onLookupComplete(request, record, status) {
      dns.isSuccess = Components.isSuccessCode(status);
      dns.isRunning = false;
    },
  },
};

export default dns;
