import { isSafeToRemoveHeaders } from '../core/helpers/strip-api-headers';

const httpHeadersToRemove = [
  'accept-language',
  'origin',
  'user-agent',
  'cookie',
];

/**
 * Information in optional HTTP headers like the user-agent could be
 * used to link requests on the server side. This hook allows to
 * mark APIs that are known to work without these headers.
 *
 * Note: Works in WebExtensions, but it is known to fail on Bootstrap,
 * as requests from the extension itself will not be modified, there.
 * Antitracking, which also uses the API, is not affected as it operates
 * on requests made by the page itself. For that, the API still works.
 */
export default function installStripApiHeadersHandler(addHandler) {
  addHandler('onBeforeSendHeaders', {
    name: 'global.stripApiHeaders',
    spec: 'blocking',
    fn: (request, response) => {
      // remove headers only for XMLHttpRequest/fetch requests from the extension
      const xmlhttprequestType = 11;
      if (request.tabId === -1 && request.typeInt === xmlhttprequestType &&
          isSafeToRemoveHeaders(request.urlParts.hostname)) {
        httpHeadersToRemove.forEach(header => response.modifyHeader(header, ''));
      }
    },
  });
}
