/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { window } from '../../platform/content/globals';
import config from '../config';

function noop() {

}

/**
 * In content context we only enable logging in developement build to not
 * pollute logs from visited web pages.
 */
export default (
  config.environment === 'development'
    ? window.console
    : new Proxy({}, {
      get() {
        return noop;
      }
    })
);
