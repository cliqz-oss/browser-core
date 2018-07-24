import { chrome } from '../globals';

export default function getHistory(text, callback) {
  const cb = (_results) => {
    const results = _results.map(r => ({
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
  const promise = chrome.history.search({ text }, cb);

  if (promise && promise.then) {
    promise.then(cb);
  }
}
