import { chrome } from '../globals';

const URL_PREFIX_BLACKLIST = [
  'moz-extension://',
  'chrome-extension://',
];

export default function getHistory(text, callback) {
  const cb = (_results) => {
    const results = _results
      .filter(({ url }) => !URL_PREFIX_BLACKLIST.find(prefix => url.indexOf(prefix) === 0))
      .map(r => ({
        comment: r.title,
        value: r.url,
        query: text,
      }));

    callback({
      query: text,
      results,
      ready: true
    });
  };

  // Support both callback and promise APIs styles
  const promise = chrome.history.search(
    {
      text,
      startTime: 0,
      maxResults: 12
    },
    cb
  );

  if (promise && promise.then) {
    promise.then(cb);
  }
}
