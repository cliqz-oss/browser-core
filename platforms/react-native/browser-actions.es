/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Keyboard, Linking, NativeModules } from 'react-native';
import { History } from './history/history';
import osAPI from './os-api';
import { getPref } from './prefs';
import console from './console';

const unsupportedError = () => {
  throw new Error('BrowserActions not supported by native');
};

const BrowserActions = NativeModules.BrowserActions || {
  searchHistory: (query, callback) => {
    if (query.length > 2) {
      History.query(5, 0, 0, undefined, query).then((results) => {
        callback(results.places);
      });
    } else {
      callback([]);
    }
  },
  openMap: unsupportedError,
  callNumber: unsupportedError,
  queryCliqz: unsupportedError,
  getReminders: unsupportedError,
  getOpenTabs: () => [],
  importBookmarks: unsupportedError,
  openLink: (url) => {
    if (!Linking) return;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log(`Don't know how to open URI: ${url}`);
      }
    });
  },
  hideKeyboard: () => Keyboard && Keyboard.dismiss(),
};

export function historySearch(q, callback) {
  BrowserActions.searchHistory(q, (data = []) => {
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

export function handleAutocompletion(url = '', query = '') {
  if (!NativeModules.AutoCompletion) {
    return;
  }
  const trimmedUrl = url.replace(/http([s]?):\/\/(www.)?/, '').toLowerCase();
  const searchLower = query.toLowerCase();
  if (trimmedUrl.startsWith(searchLower)) {
    NativeModules.AutoCompletion.autoComplete(trimmedUrl);
  } else {
    NativeModules.AutoCompletion.autoComplete(query);
  }
}

export function handleQuerySuggestions(query = '', suggestions = []) {
  if (NativeModules.QuerySuggestion && getPref('suggestionsEnabled', false)) {
    NativeModules.QuerySuggestion.showQuerySuggestions(query, suggestions);
  }
}

export const openLink = BrowserActions.openLink || unsupportedError;
export const openMap = BrowserActions.openMap || unsupportedError;
export const callNumber = BrowserActions.callNumber || unsupportedError;
export const hideKeyboard = BrowserActions.hideKeyboard || unsupportedError;
export const queryCliqz = BrowserActions.queryCliqz || unsupportedError;
export const openTab = BrowserActions.openTab || osAPI.openTab || unsupportedError;
export const getOpenTabs = BrowserActions.getOpenTabs || unsupportedError;
export const getReminders = BrowserActions.getReminders || unsupportedError;
export const importBookmarks = BrowserActions.importBookmarks || unsupportedError;
export function sendUIReadySignal() {}
