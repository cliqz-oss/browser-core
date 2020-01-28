/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { browser, chrome } from '../globals';

const MAX_RESULTS_WITH_EMPTY_QUERY = 100;
const MAX_RESULTS = 15;
const URL_PREFIX_BLACKLIST = [
  'moz-extension://',
  'chrome-extension://',
];
const unifiedSearchAvailable = browser.cliqzHistory && browser.cliqzHistory.unifiedSearch;

function isURLBlacklisted(url) {
  return URL_PREFIX_BLACKLIST.find(prefix => url.indexOf(prefix) === 0);
}

let bookmarkedURLs = new Set();
function updateBookmarksCache() {
  chrome.bookmarks.search({ query: '' }, (bookmarks) => {
    bookmarkedURLs = bookmarks.reduce((urls, bookmark) => {
      if (bookmark.url) {
        urls.add(bookmark.url);
      }
      return urls;
    }, new Set());
  });
}

if (chrome.bookmarks && !unifiedSearchAvailable) {
  chrome.bookmarks.onCreated.addListener(updateBookmarksCache);
  chrome.bookmarks.onRemoved.addListener(updateBookmarksCache);
  chrome.bookmarks.onChanged.addListener(updateBookmarksCache);
  if (chrome.bookmarks.onImportEnded) {
    // Chrome only
    chrome.bookmarks.onImportEnded.addListener(updateBookmarksCache);
  }
  updateBookmarksCache();
}

export const openedURLs = new Set();

function updateOpenedTabsCache(type, id) {
  if (chrome.windows) {
    chrome.windows.getAll({ populate: true, windowTypes: ['normal'] }, (windows) => {
      openedURLs.clear();
      windows.forEach(w => w.tabs.forEach((tab) => {
        if (type !== 'onremoved' || tab.id !== id) {
          openedURLs.add(tab.url);
        }
      }));
    });
  }
}

if (chrome.tabs) {
  chrome.tabs.onCreated.addListener(updateOpenedTabsCache);
  chrome.tabs.onRemoved.addListener(updateOpenedTabsCache.bind(null, 'onremoved'));
  chrome.tabs.onUpdated.addListener(updateOpenedTabsCache);
  chrome.tabs.onReplaced.addListener(updateOpenedTabsCache);
  updateOpenedTabsCache();
}

export default function getHistory(query, callback, isPrivate = false) {
  // we use the unified search experimental API in the Cliqz browser
  if (unifiedSearchAvailable) {
    browser.cliqzHistory.unifiedSearch(query, isPrivate).then(callback);
    return;
  }

  // `chrome.history.search` in Chrome returns no results for queries shorter than 3 symbols.
  // So in case of short query we request last MAX_RESULTS_WITH_EMPTY_QUERY history results and
  // filter them manually.
  const isShortQuery = query.length <= 3;
  const text = isShortQuery ? '' : query;
  const maxResults = isShortQuery ? MAX_RESULTS_WITH_EMPTY_QUERY : MAX_RESULTS;

  function getStyle(url) {
    const styles = [];
    if (bookmarkedURLs.has(url)) {
      styles.push('bookmark');
    }
    if (openedURLs.has(url)) {
      styles.push('switchtab');
    }
    // TODO switchtab
    return styles.join(' ');
  }

  const cb = (_results) => {
    const results = [];
    const l = _results.length;
    const q = query.toLowerCase();

    for (let i = 0; i < l && results.length < maxResults; i += 1) {
      const url = _results[i].url || '';
      const title = _results[i].title || '';
      let index = i + 1;

      if (!isURLBlacklisted(url)) {
        if (isShortQuery) {
          index = (title.toLowerCase().indexOf(q) + 1) || (url.indexOf(q) + 1);
        }

        if (index) {
          results.push({
            index,
            style: getStyle(url),
            comment: title,
            value: url,
            query,
          });
        }
      }
    }

    if (!(results.length || query)) {
      results.push(...[
        {
          index: 1,
          style: '',
          comment: 'Amazon.com: Online Shopping for Electronics, Apparel, Computers, Books, DVDs & more',
          value: 'https://amazon.com',
          query,
        },
        {
          index: 2,
          style: '',
          comment: 'YouTube',
          value: 'https://youtube.com',
          query,
        },
        {
          index: 3,
          style: '',
          comment: 'Facebook',
          value: 'https://facebook.com',
          query,
        },
      ]);
    }

    callback({
      query,
      results: isShortQuery ? results.sort((r1, r2) => r1.index - r2.index) : results,
      ready: true
    });
  };

  const promise = browser.history
    ? browser.history.search({ text, startTime: 0, maxResults })
    : Promise.resolve([]);
  promise.then(cb);
}
