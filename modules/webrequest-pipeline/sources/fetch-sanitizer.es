export function isSensitiveOriginHeader(value) {
  if (value.indexOf('moz-extension://') === 0) {
    // set by Firefox
    return true;
  }

  if (value.indexOf('chrome-extension://') === 0) {
    // set by Chrome
    return true;
  }

  return false;
}

/**
 * Makes sure that "fetch" requests contain
 * only the minimal information necessary.
 *
 * For example, Firefox in WebExtension, will always add
 * an origin header with a trackable ID to each "fetch"
 * request from within an extension. This handler will detect
 * it and remove it before the request leaves the browser.
 */
export function installFetchSanitizer(addHandler) {
  addHandler('onBeforeSendHeaders', {
    name: 'global.sanitizeFetchRequest',
    spec: 'blocking',
    fn: (request, response) => {
      const origin = request.getRequestHeader('origin');
      if (origin && isSensitiveOriginHeader(origin)) {
        response.modifyHeader('origin', '');
      }
    },
  });
}
