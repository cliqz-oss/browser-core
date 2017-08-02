import { NativeModules } from 'react-native';

const unsupportedError = () => {
  throw new Error('BrowserActions not supported by native');
};

const BrowserActions = NativeModules.BrowserActions || {
  openLink: unsupportedError,
  searchHistory: unsupportedError,
  queryCliqz: unsupportedError,
  openTab: unsupportedError,
  getReminders: unsupportedError,
  executeNativeAction: unsupportedError,
};

export const openLink = BrowserActions.openLink;

export function historySearch(q, callback) {
  BrowserActions.searchHistory(q, (data) => {
    const results = data.map(item => ({
      style: 'facicon',
      value: item.url,
      image: '',
      comment: item.title || 'no comment',
      label: ''
    }));
    callback({ results, query: q, ready: true });
  });
}

export let queryCliqz = BrowserActions.queryCliqz;
export let openTab = BrowserActions.openTab;
export let getOpenTabs = BrowserActions.getOpenTabs;
export let getReminders = BrowserActions.getReminders;
export const executeNativeAction = BrowserActions.executeNativeAction;

