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

export default function getHistory(query, callback) {
  // `chrome.history.search` in Chrome returns no results for queries shorter than 3 symbols.
  // So in case of short query we request last MAX_RESULTS_WITH_EMPTY_QUERY history results and
  // filter them manually.
  const isShortQuery = query.length <= 3;
  const text = isShortQuery ? '' : query;
  const maxResults = isShortQuery ? MAX_RESULTS_WITH_EMPTY_QUERY : MAX_RESULTS;

  const cb = (_results) => {
    const results = [];
    const l = _results.length;
    const q = query.toLowerCase();

    for (let i = 0; i < l && results.length < maxResults; i += 1) {
      const { url, title } = _results[i];
      let index = i + 1;

      if (!isURLBlacklisted(url)) {
        if (isShortQuery) {
          index = (title.toLowerCase().indexOf(q) + 1) || (url.indexOf(q) + 1);
        }

        if (index) {
          results.push({
            index,
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
