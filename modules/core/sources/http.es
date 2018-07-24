/* eslint no-param-reassign: 'off' */
/* eslint no-restricted-syntax: off */

import console from './console';
import { compress } from './gzip';
import { XMLHttpRequestFactory, setPrivateFlags, setBackgroundRequest } from '../platform/xmlhttprequest';
import { fetch as _fetch } from '../platform/fetch';
import { chromeUrlHandler } from '../platform/chrome-url-handler';

const listeners = new Set();

const notifyListeners = (params) => {
  [...listeners].forEach((listener) => {
    try {
      listener(params);
    } catch (e) {
      // carry on
    }
  });
};

export function fetch(...args) {
  notifyListeners({
    url: args[0],
  });
  return _fetch(...args);
}

export function fetchFactory() {
  return fetch;
}

export { Headers, Request, Response } from '../platform/fetch';


/** Legacy httpHandler implementation, based on XMLHttpRequest.
 *
 *  If you want to make HTTP requests, please check out the fetch API (platform/fetch)
 */
export function defaultHttpHandler(
  method,
  url,
  callback,
  onerror,
  timeout,
  data,
  sync,
  encoding,
  background
) {
  if (method === 'GET' && url.startsWith('chrome://') && chromeUrlHandler) {
    chromeUrlHandler(url, callback, onerror);
    return undefined;
  }
  const XMLHttpRequest = XMLHttpRequestFactory();
  const req = new XMLHttpRequest();
  req.timestamp = Date.now();
  if (background) {
    setBackgroundRequest(req);
  }
  req.open(method, url, !sync);
  setPrivateFlags(req);
  if (req.overrideMimeType) {
    req.overrideMimeType('application/json');
  }
  req.setRequestHeader('Content-Type', 'application/json');

  // headers for compressed data
  if (encoding) {
    req.setRequestHeader('Content-Encoding', encoding);
  }

  req.onload = () => {
    if (!parseInt) return; // parseInt is not a function after extension disable/uninstall

    const statusClass = parseInt(req.status / 100, 10);
    if (statusClass === 2 || statusClass === 3 || statusClass === 0 /* local files */) {
      if (callback) {
        callback(req);
      }
    } else {
      const error = `loaded with non-200 ${url} (status=${req.status} ${req.statusText}) CLIQZEnvironment.httpHandler`;
      console.log(error);
      if (onerror) {
        onerror(error);
      }
    }
  };
  req.onerror = () => {
    const error = `error loading ${url} (status=${req.status} ${req.statusText}) CLIQZEnvironment.httpHandler`;
    console.log(error);
    if (onerror) {
      onerror(error);
    }
  };
  req.ontimeout = () => {
    const error = `timeout for ${url} CLIQZEnvironment.httpHandler`;
    console.log(error);
    if (onerror) {
      onerror(error);
    }
  };

  if (callback) {
    if (timeout) {
      req.timeout = parseInt(timeout, 10);
    } else {
      req.timeout = (['POST', 'PUT'].indexOf(method) >= 0 ? 10000 : 1000);
    }
  }

  req.send(data);
  return req;
}

let activeHandler = defaultHttpHandler;

export function httpHandler(...args) {
  return activeHandler(...args);
}

export function _httpHandler(...args) {
  notifyListeners({
    url: args[1],
  });

  const errorHandler = args[3]; // see httpGet or httpPost arguments
  try {
    return httpHandler.call(undefined, ...args);
  } catch (e) {
    if (errorHandler) {
      errorHandler(e);
    } else {
      console.log(e, 'httpHandler failed');
    }
  }
  return undefined;
}

export function httpGet(url, callback, onerror, timeout, _, sync) {
  return _httpHandler('GET', url, callback, onerror, timeout, _, sync);
}

export function httpPost(url, callback, data, onerror, timeout) {
  return _httpHandler('POST', url, callback, onerror, timeout, data);
}

/**
 *  Replace default http handler with fn
 */
export function overrideHttpHandler(fn) {
  activeHandler = fn;
}

const compressionAvailable = Boolean(compress);
const compressionExclusions = new Set();

function compressionEnabled(url) {
  return compressionAvailable && !compressionExclusions.has(url);
}

/**
 *  Add a url for which we should not compress when using promiseHttpHandler
 */
export function addCompressionExclusion(url) {
  compressionExclusions.add(url);
}

export function promiseHttpHandler(method, url, data, timeout, compressedPost) {
  return new Promise((resolve, reject) => {
    // gzip.compress may be false if there is no implementation for this platform
    // or maybe it is not loaded yet
    if (method === 'POST' && compressedPost && compressionEnabled(url)) {
      const dataLength = data.length;
      data = compress(data);
      console.log(`Compressed request to ${url}, bytes saved = ${(dataLength - data.length)} (${((100 * (dataLength - data.length)) / dataLength).toFixed(1)}%)`, 'CLIQZEnvironment.httpHandler');
      httpHandler(method, url, resolve, reject, timeout, data, undefined, 'gzip');
    } else {
      httpHandler(method, url, resolve, reject, timeout, data);
    }
  });
}

export function addListener(listener) {
  listeners.add(listener);
}

export function removeListener(listener) {
  listeners.remove(listener);
}
