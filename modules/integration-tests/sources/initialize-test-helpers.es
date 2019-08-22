/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as browser from '../core/browser';
import * as gzip from '../core/gzip';
import history from '../core/history-manager';
import webrequest from '../core/webrequest';
import * as i18n from '../core/i18n';
import * as http from '../core/http';
import * as searchEngines from '../core/search-engines';
import testServer from '../tests/core/http-server';
import events from '../core/events';
import * as historySearch from '../core/history-search';

export default function (window) {
  Object.assign(window.CLIQZ, {
    TestHelpers: {
      events,
      testServer,
      browser,
      gzip,
      history,
      http,
      i18n,
      searchEngines,
      webrequest,
      historySearch,
    },
  });
}
