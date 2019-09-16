/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// NOTE: this is an attempt at using `webextension-polyfill` to abstract away
// API differences between different browser (e.g.: promisify chrome functions).
// Eventually, it could be used globally from 'platforms/webextension/globals.es'.
import browserPoly from 'webextension-polyfill';

export default (typeof browser !== 'undefined' ? browser : browserPoly).runtime;
