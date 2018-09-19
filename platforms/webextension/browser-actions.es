import { chrome } from './globals';
import { OS } from './platform';

const TARGET_ANDROID = 'ANDROID_BROWSER';

function sendMessageToAndroid(action, ...args) {
  chrome.runtime.sendMessage({
    source: chrome.runtime.id,
    target: TARGET_ANDROID,
    action,
    args,
  });
}

export function queryCliqz() {
}

export function openLinkAndroid(url) {
  sendMessageToAndroid('openUrl', url);
}

export function openLink(url, focused = false) {
  if (OS === 'android') {
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

export function handleAutoCompletion(url = '', query = '') {
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
