/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

module.exports = {
  history: {
    deleteVisit: () => {},
    fillFromVisit: () => {},
    showHistoryDeletionPopup: () => {},
    markAsHidden: () => {},
    cleanupEmptySearches: () => {},
    query: () => Promise.resolve({}),
  },
  // setSelectedSearchEngine,
  getSearchEngines: () => Promise.resolve([{
    default: true,
    name: 'cliqz',
    searchForm: 'https://search.cliqz.com/',
  }]),
  // changeAddonState,
  // unifiedSearch,
  // openImportDialog,
  // topDomains
}
