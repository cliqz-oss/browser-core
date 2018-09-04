import { isTrackableOriginHeaderFromOurExtension } from '../platform/fetch';

/**
 * Makes sure that "fetch" requests contain
 * only the minimal information necessary.
 *
 * For example, Firefox in WebExtension, will always add
 * an origin header with a trackable ID to each "fetch"
 * request from within an extension. This handler will detect
 * it and remove it before the request leaves the browser.
 */
export default function installFetchSanitizer(addHandler) {
  if (!isTrackableOriginHeaderFromOurExtension) {
    // no need to install a handler, as fetch on the
    // current platform does not leak
    return;
  }

  addHandler('onBeforeSendHeaders', {
    name: 'global.sanitizeFetchRequest',
    spec: 'blocking',
    fn: (request, response) => {
      const origin = request.getRequestHeader('origin');
      if (origin && isTrackableOriginHeaderFromOurExtension(origin)) {
        response.modifyHeader('origin', '');
      }
    },
  });
}
