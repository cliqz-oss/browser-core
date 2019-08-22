/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fetch, { Headers, Request, Response } from 'node-fetch';

export default fetch;

const isTrackableOriginHeaderFromOurExtension = () => false;

const $fetch = fetch;
const $Headers = Headers;
const $Request = Request;
const $Response = Response;

export {
  $fetch as fetch,
  $Headers as Headers,
  $Request as Request,
  $Response as Response,
  isTrackableOriginHeaderFromOurExtension
};
export const fetchArrayBuffer = fetch;
