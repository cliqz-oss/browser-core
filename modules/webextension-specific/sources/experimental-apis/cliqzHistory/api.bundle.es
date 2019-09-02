/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals ExtensionAPI, windowTracker  */

import History, { unifiedSearch, topDomains, stats } from './history';

global.cliqzHistory = class extends ExtensionAPI {
  getAPI() {
    return {
      cliqzHistory: {
        history: {
          deleteVisit: History.deleteVisit,
          fillFromVisit: History.fillFromVisit,
          showHistoryDeletionPopup: () =>
            History.showHistoryDeletionPopup(windowTracker.getCurrentWindow()),
          markAsHidden: History.markAsHidden,
          cleanupEmptySearches: History.cleanupEmptySearches,
          query: History.query,
          stats,
        },
        unifiedSearch,
        topDomains,
      }
    };
  }
};
