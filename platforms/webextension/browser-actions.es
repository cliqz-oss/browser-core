/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { chrome } from './globals';
import config from '../core/config';

const TARGET_ANDROID = 'ANDROID_BROWSER';

function sendMessageToAndroid(action, ...args) {
  chrome.runtime.sendMessage({
    source: chrome.runtime.id,
    target: TARGET_ANDROID,
    action,
    args,
  }, () => {
    if (chrome.runtime.lastError) {
      // Supress "Receiving end does not exist" error
    }
  });
}

export async function queryCliqz(q, options = {}) {
  return chrome.omnibox2.query(q, {
    focus: true,
    openLocation: true,
    options,
  });
}

export function openLinkAndroid(url) {
  sendMessageToAndroid('openUrl', url);
}

export function openLink(url, focused = false) {
  if (config.isMobile) {
    sendMessageToAndroid('openUrl', url);
  } else {
    chrome.tabs.create({
      url,
      active: focused
    });
  }
}

export function openTab(url) {
  chrome.tabs.create({
    url,
  });
}

export function getOpenTabs() {}

export function getReminders() {}

export function importBookmarks() {}

export function callNumber() {}

export function openMap(url) {
  sendMessageToAndroid('openUrl', url);
}

export function handleAutocompletion(url = '', query = '') {
  const urlTrimmed = url.replace(/http([s]?):\/\/(www.)?/, '').toLowerCase();
  const searchLower = query.toLowerCase();
  if (urlTrimmed.startsWith(searchLower)) {
    sendMessageToAndroid('autocomplete', urlTrimmed);
  } else {
    sendMessageToAndroid('autocomplete', query);
  }
}

export function handleQuerySuggestions(query = '', suggestions = []) {
  sendMessageToAndroid('suggestions', query, suggestions);
}

export function hideKeyboard() {}

export function sendUIReadySignal() {
  sendMessageToAndroid('renderReady');
}
