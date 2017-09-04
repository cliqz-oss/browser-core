import { NativeModules } from 'react-native';
import { History } from './history/history';

const unsupportedError = () => {
  throw new Error('BrowserActions not supported by native');
};

const BrowserActions = NativeModules.BrowserActions || {
  openLink: unsupportedError,
  searchHistory: (query, callback) => {
    if (query.length > 2) {
      History.query(5, 0, 0, undefined, query).then((results) => {
        callback(results.places);
      });
    } else {
      callback([]);
    }
  },
  queryCliqz: unsupportedError,
  openTab: unsupportedError,
  getReminders: unsupportedError,
  executeNativeAction: unsupportedError,
  getOpenTabs: () => [],
};

export const openLink = BrowserActions.openLink;

export function historySearch(q, callback) {
  BrowserActions.searchHistory(q, (data) => {
    const results = data.map(item => ({
      style: 'favicon',
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

