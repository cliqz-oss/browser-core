import CliqzEvents from '../core/events';

var CLIQZEnvironment = {
  log: console.log,
  httpHandler: function(method, url, callback, onerror, timeout, data) {
    var wrappedCallback = (cb) => {
      return (resp) => {
        if (resp) {
          console.log(JSON.stringify(resp));
        }
        cb && cb(resp);
      }
    };
    // handle chrome urls
    console.log(url);
    if (url.startsWith('chrome://')) {
      chromeUrlHandler(url, wrappedCallback(callback), wrappedCallback(onerror));
    } else {
      httpHandler(method, url, wrappedCallback(callback), wrappedCallback(onerror), timeout || method === 'POST' ? 10000 : 1000, data || null);
    }
  },
  promiseHttpHandler: function(method, url, data, timeout, compressedPost) {
    return new Promise( function(resolve, reject) {
      // gzip.compress may be false if there is no implementation for this platform
      // or maybe it is not loaded yet
      if (CLIQZEnvironment.gzip && CLIQZEnvironment.gzip.compress && method === 'POST' && compressedPost) {
        const dataLength = data.length;
        data = CLIQZEnvironment.gzip.compress(data);
        CLIQZEnvironment.log("Compressed request to "+ url +", bytes saved = "+ (dataLength - data.length) + " (" + (100*(dataLength - data.length)/ dataLength).toFixed(1) +"%)", "CLIQZEnvironment.httpHandler");
        CLIQZEnvironment.httpHandler(method, url, resolve, reject, timeout, data, undefined, 'gzip');
      } else {
        CLIQZEnvironment.httpHandler(method, url, resolve, reject, timeout, data);
      }
    });
  },
  setTimeout: setTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  clearTimeout: clearInterval,
  Promise: Promise,
  telemetry: function() {},
};

export default CLIQZEnvironment;
