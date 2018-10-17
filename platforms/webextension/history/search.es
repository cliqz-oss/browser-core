import { chrome } from '../globals';

const MAX_RESULTS_WITH_EMPTY_QUERY = 100;
const MAX_RESULTS = 15;
const URL_PREFIX_BLACKLIST = [
  'moz-extension://',
  'chrome-extension://',
];

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

if (chrome.bookmarks) {
  chrome.bookmarks.onCreated.addListener(updateBookmarksCache);
  chrome.bookmarks.onRemoved.addListener(updateBookmarksCache);
  chrome.bookmarks.onChanged.addListener(updateBookmarksCache);
  if (chrome.bookmarks.onImportEnded) {
    // Chrome only
    chrome.bookmarks.onImportEnded.addListener(updateBookmarksCache);
  }
  updateBookmarksCache();
}

export default function getHistory(query, callback) {
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

    callback({
      query,
      results: isShortQuery ? results.sort((r1, r2) => r1.index - r2.index) : results,
      ready: true
    });
  };

  // Support both callback and promise APIs styles
  const promise = chrome.history.search(
    {
      text,
      startTime: 0,
      maxResults,
    },
    cb
  );

  if (promise && promise.then) {
    promise.then(cb);
  }
}
