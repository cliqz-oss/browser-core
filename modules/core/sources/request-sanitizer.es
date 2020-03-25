/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import webRequest from './webrequest';
import { isSafeToRemoveHeaders } from './helpers/strip-api-headers';
import { isTrackableOriginHeaderFromOurExtension } from '../platform/fetch';
import console from './console';
import { extractHostname } from './tlds';
import PermissionManager from '../platform/permission-manager';

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

let HAS_RIGHT_PERMISSIONS = false;

export async function enableRequestSanitizer() {
  // WebExtension might not have webRequest API permission
  HAS_RIGHT_PERMISSIONS = await PermissionManager.contains([
    PermissionManager.PERMISSIONS.WEB_REQUEST, PermissionManager.PERMISSIONS.WEB_REQUEST_BLOCKING]);

  if (!HAS_RIGHT_PERMISSIONS) {
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
  if (!HAS_RIGHT_PERMISSIONS) {
    return;
  }
  webRequest.onBeforeSendHeaders.removeListener(safeFilter);
}
