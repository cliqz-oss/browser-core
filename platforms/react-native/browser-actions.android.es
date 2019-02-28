import { NativeModules } from 'react-native';
// import { History } from './history/history';
// import osAPI from './os-api';
import { getPref } from './prefs';

const unsupportedError = () => {
  // throw new Error('BrowserActions not supported by native');
};

const BrowserActions = NativeModules.BrowserActions || {
  searchHistory: () => {},
  openLink: unsupportedError,
  openMap: unsupportedError,
  callNumber: unsupportedError,
  hideKeyboard: unsupportedError,
  queryCliqz: unsupportedError,
  getReminders: unsupportedError,
  getOpenTabs: () => [],
  importBookmarks: unsupportedError,
};

export function historySearch(q, callback) {
  const results = { ready: true, results: [] };
  callback(results); return Promise.resolve(results);
}

export function handleAutocompletion(url = '', query = '') {
  if (!BrowserActions.autocomplete) {
    unsupportedError();
    return;
  }
  const trimmedUrl = url.replace(/http([s]?):\/\/(www.)?/, '').toLowerCase();
  const searchLower = query.toLowerCase();
  if (trimmedUrl.startsWith(searchLower)) {
    BrowserActions.autocomplete(trimmedUrl);
  } else {
    BrowserActions.autocomplete(query);
  }
}

export function handleQuerySuggestions(query = '', suggestions = []) {
  if (!getPref('suggestionsEnabled', false) || !BrowserActions.suggest) {
    return;
  }
  BrowserActions.suggest(query, suggestions);
}

export const openLink = BrowserActions.openLink || unsupportedError;
export const openMap = BrowserActions.openMap || unsupportedError;
export const callNumber = BrowserActions.callNumber || unsupportedError;
export const hideKeyboard = BrowserActions.hideKeyboard || unsupportedError;
export const queryCliqz = BrowserActions.queryCliqz || unsupportedError;
export const openTab = BrowserActions.openTab || unsupportedError;
export const getOpenTabs = BrowserActions.getOpenTabs || unsupportedError;
export const getReminders = BrowserActions.getReminders || unsupportedError;
export const importBookmarks = BrowserActions.importBookmarks || unsupportedError;
export function sendUIReadySignal() {}
