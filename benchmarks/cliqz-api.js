
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