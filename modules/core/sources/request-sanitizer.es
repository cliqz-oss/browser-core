import webRequest from './webrequest';
import { isSafeToRemoveHeaders } from './helpers/strip-api-headers';
import { isTrackableOriginHeaderFromOurExtension } from '../platform/fetch';
import console from './console';
import { extractHostname } from './tlds';

function findHeader(requestHeaders, header) {
  const x = requestHeaders.find(({ name }) => name.toLowerCase() === header);
  return x ? x.value : '';
}

function safeFilter(req) {
  const { requestHeaders, type, url, tabId } = req;

  if (tabId !== -1) {
    return undefined;
  }

  const hostname = extractHostname(url);
  if (!hostname) {
    console.warn('Could not extract hostname', url);
    return undefined;
  }

  const headersToRemove = [];
  if (isSafeToRemoveHeaders(hostname)) {
    headersToRemove.push('origin', 'cookie');
    if (type === 'xmlhttprequest') {
      headersToRemove.push('accept-language', 'user-agent');
    }
  } else if (isTrackableOriginHeaderFromOurExtension(findHeader(requestHeaders, 'origin'))) {
    headersToRemove.push('origin'); // Prevent extension origin leaks
  }

  if (headersToRemove.length > 0) {
    return {
      requestHeaders: requestHeaders.filter(h => !headersToRemove.includes(h.name.toLowerCase()))
    };
  }

  return undefined;
}

export function enableRequestSanitizer() {
  // WebExtension might not have webRequest API permission
  if (!webRequest) {
    return;
  }
  const networkFilters = {
    urls: ['<all_urls>'],
    tabId: -1,
  };
  webRequest.onBeforeSendHeaders.addListener(
    safeFilter,
    networkFilters,
    ['blocking', 'requestHeaders'],
  );
}

export function disableRequestSanitizer() {
  if (!webRequest) {
    return;
  }
  webRequest.onBeforeSendHeaders.removeListener(safeFilter);
}
