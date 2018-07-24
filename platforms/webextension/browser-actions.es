import { chrome } from './globals';

export function queryCliqz() {
}

export function openLink(url) {
  chrome.tabs.create({
    url,
  });
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
  chrome.tabs.create({
    url,
  });
}

export function hideKeyboard() {}
