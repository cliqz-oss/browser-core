import { NativeModules } from 'react-native';
import { getPref } from './prefs';

const unsupportedError = () => {
  // throw new Error('BrowserActions not supported by native');
};

const BrowserActions = NativeModules.BrowserActions;

export function historySearch(q, callback) {
  BrowserActions.searchHistory(q).then((data = []) => {
    const results = data.map(item => ({
      style: 'favicon',
      value: item.url,
      image: '',
      comment: item.title || 'no comment',
      label: ''
    }));
    const res = { ready: true, results };
    if (callback) {
      callback(res);
    }
  });
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
