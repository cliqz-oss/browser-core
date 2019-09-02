/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import webrequest, { VALID_RESPONSE_PROPERTIES } from '../platform/webrequest';
import { isEdge } from './platform';

export default webrequest;

export {
  VALID_RESPONSE_PROPERTIES
};

function getOptionArray(options) {
  if (!options) {
    return [];
  }
  // get subset of options which are defined
  return [
    options.BLOCKING,
    // firefox and chrome disagree on how to name these
    options.REQUEST_HEADERS || options.REQUESTHEADERS,
    options.RESPONSE_HEADERS || options.RESPONSEHEADERS,
    // extra headers: Chrome 72:
    // https://groups.google.com/a/chromium.org/forum/#!topic/chromium-extensions/vYIaeezZwfQ
    options.EXTRA_HEADERS,
    // request body disabled to avoid the overhead when not needed
    // options.REQUEST_BODY,
  ].filter(o => !!o);
}

// build allowed extraInfo options from <Step>Options objects.
export const EXTRA_INFO_SPEC = !isEdge ? {
  onBeforeRequest: getOptionArray(webrequest.OnBeforeRequestOptions),
  onBeforeSendHeaders: getOptionArray(webrequest.OnBeforeSendHeadersOptions),
  onSendHeaders: getOptionArray(webrequest.OnSendHeadersOptions),
  onHeadersReceived: getOptionArray(webrequest.OnHeadersReceivedOptions),
  onAuthRequired: getOptionArray(webrequest.OnAuthRequiredOptions),
  onResponseStarted: getOptionArray(webrequest.OnResponseStartedOptions),
  onBeforeRedirect: getOptionArray(webrequest.OnBeforeRedirectOptions),
  onCompleted: getOptionArray(webrequest.OnCompletedOptions),
  onErrorOccurred: undefined,
} : {
  onBeforeRequest: ['blocking'],
  onBeforeSendHeaders: ['blocking', 'requestHeaders'],
  onSendHeaders: ['requestHeaders'],
  onHeadersReceived: ['blocking', 'requestHeaders'],
  onAuthRequired: ['responseHeaders', 'blocking'],
  onResponseStarted: ['responseHeaders'],
  onBeforeRedirect: ['responseHeaders'],
  onCompleted: ['responseHeaders'],
  onErrorOccurred: undefined,
};
